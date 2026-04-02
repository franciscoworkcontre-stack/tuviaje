import type { HotelRecommendation } from "@/types/trip";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "oeiQgfg5fsmIJB7Cn"; // voyager/booking-scraper

const STYLE_SORT: Record<string, string> = {
  mochilero: "popularity",
  comfort:   "popularity",
  premium:   "review_score",
};

const STYLE_PRICE: Record<string, string> = {
  mochilero: "0-80",
  comfort:   "0-300",
  premium:   "0-999999",
};

const USD_TO_CLP = 950;

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
        maxItems: 4,
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
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=4`
  );
  if (!itemsRes.ok) return [];

  const items = await itemsRes.json() as Array<{
    name?: string;
    stars?: number;
    price?: number;
    currency?: string;
    rating?: number;
    address?: { full?: string; region?: string };
    url?: string;
    type?: string;
  }>;

  const mapped = items
    .filter(h => h.name && h.price)
    .map(h => {
      const priceUsd = h.price ?? 0;
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
      if (h.rating && h.rating >= 9) pros.push(`Valoración excelente: ${h.rating}/10`);
      else if (h.rating && h.rating >= 8) pros.push(`Buena valoración: ${h.rating}/10`);
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

  // Filter to rating >= 7 if we have enough options, then sort by best value (rating/price)
  const goodOnes = mapped.filter(h => (h.rating ?? 0) >= 7);
  const pool = goodOnes.length >= 2 ? goodOnes : mapped;

  // Score: higher rating = better, higher price = worse. Normalize price to 0-1 range.
  const prices = pool.map(h => h.pricePerNightClp);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  pool.sort((a, b) => {
    const scoreA = (a.rating ?? 7) - ((a.pricePerNightClp - minP) / range) * 2;
    const scoreB = (b.rating ?? 7) - ((b.pricePerNightClp - minP) / range) * 2;
    return scoreB - scoreA;
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
