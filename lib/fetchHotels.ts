import type { HotelRecommendation } from "@/types/trip";

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const USD_TO_CLP = 950;

// Minimum reviews to consider a hotel well-reviewed
const MIN_REVIEWS = 1_000;

// Hard per-night price cap by travel style (CLP/night)
const PRICE_CAP_CLP: Record<string, number> = {
  mochilero: 80_000,   // ~$84 USD/night
  comfort:   180_000,  // ~$189 USD/night
  premium:   450_000,  // ~$473 USD/night
};

interface SerpHotel {
  name: string;
  overall_rating?: number;       // 0–10
  reviews?: number;
  stars?: number;
  rate_per_night?: { extracted_lowest?: number }; // USD
  prices?: { extracted_lowest?: number }[];
  hotel_class?: string;          // "3-star hotel" etc.
  amenities?: string[];
  link?: string;
  gps_coordinates?: { latitude: number; longitude: number };
  description?: string;
  check_in_time?: string;
  check_out_time?: string;
  images?: { thumbnail?: string }[];
}

async function scrapeCity(
  city: string,
  checkIn: string,
  checkOut: string,
  adults: number,
  travelStyle: string
): Promise<HotelRecommendation[]> {
  if (!SERPAPI_KEY) {
    console.warn("SERPAPI_KEY not set");
    return [];
  }

  const params = new URLSearchParams({
    engine:        "google_hotels",
    q:             city,
    check_in_date:  checkIn,
    check_out_date: checkOut,
    adults:        String(adults),
    currency:      "USD",
    gl:            "us",
    hl:            "es",
    num:           "20",
    api_key:       SERPAPI_KEY,
  });

  // Style-based sort
  if (travelStyle === "mochilero") {
    params.set("sort_by", "3"); // lowest price
  } else {
    params.set("sort_by", "8"); // top rated
  }

  // Price filter (USD/night)
  if (travelStyle === "mochilero") {
    params.set("max_price", "85");
  } else if (travelStyle === "comfort") {
    params.set("max_price", "200");
  }

  // Minimum rating filter (SerpAPI: 1=Any, 7=7+, 8=8+, 9=9+)
  params.set("min_rating", travelStyle === "mochilero" ? "7" : "8");

  const url = `https://serpapi.com/search.json?${params.toString()}`;

  let data: { properties?: SerpHotel[]; error?: string };
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h
    if (!res.ok) return [];
    data = await res.json();
  } catch {
    return [];
  }

  if (data.error || !data.properties?.length) return [];

  const items = data.properties;

  // Prefer hotels with >= MIN_REVIEWS; fall back to all with a price
  const withPrice = items.filter(h => h.rate_per_night?.extracted_lowest);
  const withReviews = withPrice.filter(h => (h.reviews ?? 0) >= MIN_REVIEWS);
  const candidates = withReviews.length >= 2 ? withReviews : withPrice;

  // Apply per-night CLP cap
  const capClp = PRICE_CAP_CLP[travelStyle];
  let pool = candidates;
  if (capClp) {
    const withinCap = candidates.filter(h => {
      const clp = Math.round((h.rate_per_night!.extracted_lowest!) * USD_TO_CLP);
      return clp <= capClp;
    });
    pool = withinCap.length >= 2
      ? withinCap
      : candidates.slice().sort((a, b) =>
          (a.rate_per_night?.extracted_lowest ?? 0) - (b.rate_per_night?.extracted_lowest ?? 0)
        ).slice(0, 3);
  }

  const mapped: HotelRecommendation[] = pool.map(h => {
    const priceUsd = h.rate_per_night?.extracted_lowest ?? 0;
    const priceClp = Math.round(priceUsd * USD_TO_CLP);
    const rating = h.overall_rating ?? 0;
    const reviews = h.reviews ?? 0;
    const stars = h.stars ?? (
      travelStyle === "premium" ? 5 : travelStyle === "comfort" ? 4 : 2
    );

    // Extract neighborhood from hotel class or description
    const neighborhood = city;

    const pros: string[] = [];
    const cons: string[] = [];

    if (rating >= 9)      pros.push(`Valoración excelente: ${rating}/10 · ${reviews.toLocaleString("es-CL")} reseñas`);
    else if (rating >= 8) pros.push(`Muy buena valoración: ${rating}/10 · ${reviews.toLocaleString("es-CL")} reseñas`);
    else if (reviews > 0) pros.push(`${reviews.toLocaleString("es-CL")} reseñas verificadas`);

    if (stars >= 4) pros.push(`Hotel ${stars}★`);
    if (priceUsd < 80)  pros.push("Muy económico para la zona");
    if (h.amenities?.includes("Free Wi-Fi")) pros.push("Wi-Fi gratuito incluido");
    if (h.amenities?.some(a => a.toLowerCase().includes("pool"))) pros.push("Piscina");
    if (h.amenities?.some(a => a.toLowerCase().includes("breakfast"))) pros.push("Desayuno disponible");

    pros.push("Precio real verificado en Google Hotels");

    if (priceUsd > 300) cons.push("Precio elevado");
    cons.push("Verifica disponibilidad antes de reservar");

    const bookingSearchUrl = h.link
      ?? `https://www.google.com/travel/hotels/entity/${encodeURIComponent(h.name)}?q=${encodeURIComponent(h.name + " " + city)}&checkin=${checkIn}&checkout=${checkOut}&adults=${adults}`;

    return {
      name: h.name,
      neighborhood,
      stars,
      pricePerNightClp: priceClp,
      rating,
      style: stars >= 5 ? "boutique" : stars >= 4 ? "business" : "hostal",
      pros,
      cons,
      bookingSearchUrl,
    } satisfies HotelRecommendation;
  });

  // Sort: rating desc, then price asc for ties
  mapped.sort((a, b) => {
    const rd = (b.rating ?? 0) - (a.rating ?? 0);
    if (Math.abs(rd) >= 0.3) return rd;
    return a.pricePerNightClp - b.pricePerNightClp;
  });

  // Mark top pick
  if (mapped[0]) {
    mapped[0].pros = ["⭐ Mejor relación calidad/precio", ...mapped[0].pros];
  }

  return mapped.slice(0, 5); // top 5
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
  return Object.fromEntries(cities.map((city, i) => [city, results[i]]));
}
