import type { HotelRecommendation } from "@/types/trip";

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const USD_TO_CLP = 950;

// ── Scoring config ────────────────────────────────────────────────────────────
// Each rating point reduces the effective nightly cost by this amount (CLP).
// Higher = style cares more about quality, will pay more for a better rating.
export const RATING_VALUE_CLP: Record<string, number> = {
  mochilero:  8_000,   // ~$8 USD per rating point — price-driven
  comfort:   25_000,   // ~$26 USD per rating point
  premium:   60_000,   // ~$63 USD per rating point — quality-driven
};

// Bayesian prior: hotels with fewer than M reviews get pulled toward C
const BAYES_M = 300;   // confidence threshold (reviews)
const BAYES_C = 8.0;   // assumed mean rating

function bayesRating(rating: number, reviews: number): number {
  return (reviews * rating + BAYES_M * BAYES_C) / (reviews + BAYES_M);
}

export function hotelScore(priceClp: number, rating: number, reviews: number, travelStyle: string): number {
  const ratingValue = RATING_VALUE_CLP[travelStyle] ?? RATING_VALUE_CLP.comfort;
  return priceClp - bayesRating(rating, reviews) * ratingValue;
}

// Minimum hotel star class by travel style
const MIN_STARS: Record<string, number> = {
  mochilero: 2,
  comfort:   4,
  premium:   4,
};

// Hard per-night price cap by style (CLP)
const PRICE_CAP_CLP: Record<string, number> = {
  mochilero:  80_000,
  comfort:   200_000,
  premium:   500_000,
};

interface SerpHotel {
  name: string;
  overall_rating?: number;
  reviews?: number;
  stars?: number;
  rate_per_night?: { extracted_lowest?: number };
  hotel_class?: string;
  amenities?: string[];
  link?: string;
  type?: string;
  description?: string;
}

async function scrapeCity(
  city: string,
  checkIn: string,
  checkOut: string,
  adults: number,
  travelStyle: string
): Promise<HotelRecommendation | null> {
  if (!SERPAPI_KEY) return null;

  const params = new URLSearchParams({
    engine:         "google_hotels",
    q:              city,
    check_in_date:  checkIn,
    check_out_date: checkOut,
    adults:         String(adults),
    currency:       "USD",
    gl:             "us",
    hl:             "es",
    num:            "40",
    sort_by:        "8",   // top rated
    api_key:        SERPAPI_KEY,
  });

  if (travelStyle === "mochilero") params.set("max_price", "90");
  else if (travelStyle === "comfort") params.set("max_price", "220");

  // Request 8+ rated hotels from API (relaxed below in JS if needed)
  params.set("min_rating", "8");

  let data: { properties?: SerpHotel[]; error?: string };
  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    data = await res.json();
  } catch {
    return null;
  }

  if (data.error || !data.properties?.length) return null;

  // Must have price and name
  let pool = data.properties.filter(h => h.rate_per_night?.extracted_lowest && h.name);
  if (!pool.length) return null;

  // Apply minimum stars filter — comfort/premium never below 4★
  const minStars = MIN_STARS[travelStyle] ?? 2;
  const starFiltered = pool.filter(h => (h.stars ?? 0) >= minStars);
  if (starFiltered.length >= 1) pool = starFiltered;
  // If no hotels meet the star requirement, fall back to full pool
  // (remote destinations may not have 4★ hotels)

  // Apply CLP price cap if enough candidates survive
  const capClp = PRICE_CAP_CLP[travelStyle];
  if (capClp && pool.length >= 2) {
    const capped = pool.filter(h =>
      Math.round((h.rate_per_night!.extracted_lowest!) * USD_TO_CLP) <= capClp
    );
    if (capped.length >= 1) pool = capped;
  }

  // Score each hotel: lower = better value
  // score = priceClp - bayesRating(rating, reviews) × RATING_VALUE_CLP[style]
  const scored = pool.map(h => {
    const priceClp = Math.round((h.rate_per_night!.extracted_lowest!) * USD_TO_CLP);
    const rating   = h.overall_rating ?? 7.5;
    const reviews  = h.reviews ?? 0;
    const score    = hotelScore(priceClp, rating, reviews, travelStyle);
    return { h, priceClp, score };
  });

  scored.sort((a, b) => a.score - b.score);
  const { h: winner, priceClp } = scored[0];

  const rating  = winner.overall_rating ?? 0;
  const reviews = winner.reviews ?? 0;
  const stars   = winner.stars ?? (travelStyle === "premium" ? 5 : travelStyle === "comfort" ? 4 : 3);

  const pros: string[] = [];
  const cons: string[] = [];

  if (rating >= 9)      pros.push(`Valoración excepcional: ${rating}/10`);
  else if (rating >= 8) pros.push(`Muy bien valorado: ${rating}/10`);
  if (reviews >= 1000)  pros.push(`${reviews.toLocaleString("es-CL")} reseñas verificadas`);
  else if (reviews > 0) pros.push(`${reviews.toLocaleString("es-CL")} reseñas`);
  if (stars >= 4)       pros.push(`Hotel ${stars}★`);
  if (priceClp / USD_TO_CLP < 80) pros.push("Excelente precio para la zona");
  if (winner.amenities?.some(a => /wifi|wi-fi/i.test(a))) pros.push("Wi-Fi gratuito");
  if (winner.amenities?.some(a => /pool|piscina/i.test(a))) pros.push("Piscina");
  if (winner.amenities?.some(a => /breakfast|desayuno/i.test(a))) pros.push("Desayuno disponible");
  pros.push("Precio real verificado en Google Hotels");
  if (priceClp / USD_TO_CLP > 300) cons.push("Precio elevado");
  cons.push("Confirma disponibilidad antes de reservar");

  return {
    name: winner.name,
    neighborhood: city,
    stars,
    pricePerNightClp: priceClp,
    rating,
    reviews,
    style: stars >= 5 ? "boutique" : stars >= 4 ? "business" : "hostal",
    pros,
    cons,
    bookingSearchUrl: winner.link
      ?? `https://www.google.com/travel/hotels/entity?q=${encodeURIComponent(winner.name + " " + city)}&checkin=${checkIn}&checkout=${checkOut}&adults=${adults}`,
  } satisfies HotelRecommendation;
}

export async function fetchHotelsForCities(
  cities: string[],
  travelStyle: string,
  checkIn: string,
  checkOut: string,
  adults: number
): Promise<Record<string, HotelRecommendation[]>> {
  const results = await Promise.all(
    cities.map(city => scrapeCity(city, checkIn, checkOut, adults, travelStyle))
  );
  return Object.fromEntries(
    cities.map((city, i) => [city, results[i] ? [results[i]!] : []])
  );
}
