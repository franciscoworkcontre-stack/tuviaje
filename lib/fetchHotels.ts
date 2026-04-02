import type { HotelRecommendation } from "@/types/trip";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "oeiQgfg5fsmIJB7Cn"; // voyager/booking-scraper

const STYLE_SORT: Record<string, string> = {
  mochilero: "class_and_price",
  comfort:   "review_score_and_price",
  premium:   "bayesian_review_score",
};

const STYLE_PRICE: Record<string, string> = {
  mochilero: "0-80",
  comfort:   "0-300",
  premium:   "0-999999",
};

const USD_TO_CLP = 950;

function nightsBetween(checkIn: string, checkOut: string): number {
  const msPerDay = 86_400_000;
  const nights = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / msPerDay;
  return Math.max(1, Math.round(nights));
}

async function scrapeCity(
  city: string,
  checkIn: string,
  checkOut: string,
  adults: number,
  travelStyle: string
): Promise<HotelRecommendation[]> {
  if (!APIFY_TOKEN) return [];

  const startRes = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        search: city,
        maxItems: 20,
        extractAdditionalHotelData: false,
        sortBy: STYLE_SORT[travelStyle] ?? "class_asc",
        currency: "USD",
        language: "en-gb",
        checkIn,
        checkOut,
        rooms: 1,
        adults,
        children: 0,
        minMaxPrice: STYLE_PRICE[travelStyle] ?? "0-999999",
      }),
    }
  );

  if (!startRes.ok) return [];
  const startData = await startRes.json() as { data: { id: string; defaultDatasetId: string } };
  const runId = startData.data.id;
  const datasetId = startData.data.defaultDatasetId;

  // Poll until done (max 100s)
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const pollData = await pollRes.json() as { data: { status: string } };
    const st = pollData.data.status;
    if (st === "SUCCEEDED") break;
    if (st === "FAILED" || st === "ABORTED" || st === "TIMED-OUT") return [];
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=20`
  );
  if (!itemsRes.ok) return [];

  const items = await itemsRes.json() as Array<{
    name?: string;
    stars?: number;
    price?: number;
    currency?: string;
    rating?: number;
    reviews?: number;
    address?: { full?: string; region?: string };
    url?: string;
    type?: string;
  }>;

  // Apify voyager returns the TOTAL price for the stay, not per-night.
  // We must divide by number of nights to get the per-night price.
  const nights = nightsBetween(checkIn, checkOut);

  // Require at least 1000 reviews — fall back to any with name+price if none qualify
  const MIN_REVIEWS = 1000;
  const withEnoughReviews = items.filter(h => h.name && h.price && (h.reviews ?? 0) >= MIN_REVIEWS);
  const candidates = withEnoughReviews.length >= 2 ? withEnoughReviews : items.filter(h => h.name && h.price);

  // Hard per-night price cap by travel style (CLP/night after dividing by nights)
  const PRICE_CAP_CLP: Record<string, number> = {
    mochilero: 80_000,   // ~$84 USD/night
    comfort:   180_000,  // ~$189 USD/night
    premium:   450_000,  // ~$473 USD/night
  };
  const capClp = PRICE_CAP_CLP[travelStyle];
  let cappedCandidates = candidates;
  if (capClp !== undefined) {
    const withinCap = candidates.filter(h => {
      const perNightClp = Math.round(((h.price ?? 0) / nights) * USD_TO_CLP);
      return perNightClp <= capClp;
    });
    // If fewer than 2 qualify, take the 2 cheapest (by per-night price)
    cappedCandidates = withinCap.length >= 2
      ? withinCap
      : candidates.slice().sort((a, b) => (a.price ?? 0) - (b.price ?? 0)).slice(0, 2);
  }

  const mapped = cappedCandidates
    .map(h => {
      // Divide total stay price by nights to get per-night price
      const priceUsd = (h.price ?? 0) / nights;
      const priceClp = Math.round(priceUsd * USD_TO_CLP);
      const neighborhood = h.address?.region || h.address?.full?.split(",")[1]?.trim() || city;
      const stars = h.stars ?? (travelStyle === "premium" ? 5 : travelStyle === "comfort" ? 3 : 1);
      const style = h.type === "hostel" ? "hostal"
        : h.type === "apartment" ? "apart-hotel"
        : stars >= 5 ? "boutique"
        : stars >= 4 ? "business"
        : "hostal";

      const pros: string[] = [];
      const cons: string[] = [];
      if (h.rating && h.rating >= 9) pros.push(`Valoración excelente: ${h.rating}/10 · ${(h.reviews ?? 0).toLocaleString("es-CL")} reseñas`);
      else if (h.rating && h.rating >= 8) pros.push(`Buena valoración: ${h.rating}/10 · ${(h.reviews ?? 0).toLocaleString("es-CL")} reseñas`);
      else if (h.reviews) pros.push(`${(h.reviews ?? 0).toLocaleString("es-CL")} reseñas verificadas`);
      if (stars >= 4) pros.push(`Hotel ${stars}★`);
      pros.push("Precio real verificado en Booking");
      if (priceUsd < 80) pros.push("Muy económico para la zona");
      else if (priceUsd > 300) cons.push("Precio elevado");
      cons.push("Verifica disponibilidad antes de reservar");

      return {
        name: h.name!,
        neighborhood,
        stars,
        pricePerNightClp: priceClp,
        rating: h.rating ?? 0,
        style,
        pros,
        cons,
        bookingSearchUrl: h.url ?? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(h.name! + " " + city)}&lang=es&checkin=${checkIn}&checkout=${checkOut}&group_adults=${adults}`,
      } satisfies HotelRecommendation;
    });

  // Keep only hotels with rating >= 7 and reviews >= 1000 if we have enough
  const goodOnes = mapped.filter(h => (h.rating ?? 0) >= 7);
  const pool = goodOnes.length >= 2 ? goodOnes : mapped;

  // Sort priority: 1) rating descending  2) price ascending (cheapest first when tied)
  pool.sort((a, b) => {
    const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
    if (Math.abs(ratingDiff) >= 0.5) return ratingDiff; // clear rating difference
    return a.pricePerNightClp - b.pricePerNightClp;     // same rating → cheapest first
  });

  // Mark the top pick
  if (pool[0]) {
    pool[0].pros = ["⭐ Mejor relación calidad/precio", ...pool[0].pros];
  }

  return pool;
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
