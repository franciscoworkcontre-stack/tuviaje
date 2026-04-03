import type { HotelRecommendation } from "@/types/trip";

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const USD_TO_CLP = 950;

// Quality tiers — try strict first, relax if not enough results
const QUALITY_TIERS = [
  { minRating: 8.5, minReviews: 500 },
  { minRating: 8.0, minReviews: 200 },
  { minRating: 7.5, minReviews: 100 },
  { minRating: 0,   minReviews: 0   }, // last resort: anything with price
];

// Hard per-night price cap by style (CLP)
const PRICE_CAP_CLP: Record<string, number> = {
  mochilero: 80_000,
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
    num:            "40",       // fetch more to have better candidates
    sort_by:        "8",        // top rated — always, regardless of style
    api_key:        SERPAPI_KEY,
  });

  // Price ceiling from Google's side (rough USD/night)
  if (travelStyle === "mochilero") params.set("max_price", "90");
  else if (travelStyle === "comfort") params.set("max_price", "220");
  // premium: no ceiling — let rating/reviews decide

  // Start with strictest rating filter the API supports
  params.set("min_rating", "8"); // SerpAPI: 7=7+, 8=8+, 9=9+

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

  const withPrice = data.properties.filter(h => h.rate_per_night?.extracted_lowest && h.name);
  if (!withPrice.length) return null;

  const capClp = PRICE_CAP_CLP[travelStyle];

  // Try quality tiers from strictest to most relaxed
  let winner: SerpHotel | null = null;
  for (const tier of QUALITY_TIERS) {
    // Filter by this tier's quality thresholds
    let pool = withPrice.filter(h =>
      (h.overall_rating ?? 0) >= tier.minRating &&
      (h.reviews ?? 0) >= tier.minReviews
    );

    // Apply CLP cap if we have enough candidates
    if (capClp && pool.length >= 2) {
      const capped = pool.filter(h =>
        Math.round((h.rate_per_night!.extracted_lowest!) * USD_TO_CLP) <= capClp
      );
      if (capped.length >= 1) pool = capped;
    }

    if (!pool.length) continue;

    // Among qualified hotels: sort by rating desc, then price asc
    // This picks the highest-rated, and breaks ties by cheapest
    pool.sort((a, b) => {
      const ratingDiff = (b.overall_rating ?? 0) - (a.overall_rating ?? 0);
      if (Math.abs(ratingDiff) >= 0.3) return ratingDiff;
      return (a.rate_per_night?.extracted_lowest ?? 0) - (b.rate_per_night?.extracted_lowest ?? 0);
    });

    winner = pool[0];
    break;
  }

  if (!winner) return null;

  const priceUsd = winner.rate_per_night?.extracted_lowest ?? 0;
  const priceClp = Math.round(priceUsd * USD_TO_CLP);
  const rating = winner.overall_rating ?? 0;
  const reviews = winner.reviews ?? 0;
  const stars = winner.stars ?? (travelStyle === "premium" ? 5 : travelStyle === "comfort" ? 4 : 3);

  const pros: string[] = [];
  const cons: string[] = [];

  if (rating >= 9)      pros.push(`Valoración excepcional: ${rating}/10`);
  else if (rating >= 8) pros.push(`Muy bien valorado: ${rating}/10`);
  if (reviews >= 1000)  pros.push(`${reviews.toLocaleString("es-CL")} reseñas verificadas`);
  else if (reviews > 0) pros.push(`${reviews.toLocaleString("es-CL")} reseñas`);
  if (stars >= 4)       pros.push(`Hotel ${stars}★`);
  if (priceUsd < 80)    pros.push("Excelente precio para la zona");
  if (winner.amenities?.some(a => /wifi|wi-fi/i.test(a))) pros.push("Wi-Fi gratuito");
  if (winner.amenities?.some(a => /pool|piscina/i.test(a))) pros.push("Piscina");
  if (winner.amenities?.some(a => /breakfast|desayuno/i.test(a))) pros.push("Desayuno disponible");
  pros.push("Precio real verificado en Google Hotels");
  if (priceUsd > 300) cons.push("Precio elevado");
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
    // selectionReason will be filled by the itinerary route after fetching
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
  // Return as array of 1 (or 0 if not found) — callers expect Record<city, HotelRec[]>
  return Object.fromEntries(
    cities.map((city, i) => [city, results[i] ? [results[i]!] : []])
  );
}
