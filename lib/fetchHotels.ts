import Anthropic from "@anthropic-ai/sdk";
import type { HotelRecommendation } from "@/types/trip";

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const USD_TO_CLP = 950;

// ── Scoring config ────────────────────────────────────────────────────────────
export const RATING_VALUE_CLP: Record<string, number> = {
  mochilero:  8_000,
  comfort:   25_000,
  premium:   60_000,
};

const BAYES_M = 300;
const BAYES_C = 8.0;

function bayesRating(rating: number, reviews: number): number {
  return (reviews * rating + BAYES_M * BAYES_C) / (reviews + BAYES_M);
}

export function hotelScore(priceClp: number, rating: number, reviews: number, travelStyle: string): number {
  const ratingValue = RATING_VALUE_CLP[travelStyle] ?? RATING_VALUE_CLP.comfort;
  return priceClp - bayesRating(rating, reviews) * ratingValue;
}

const MIN_STARS: Record<string, number> = {
  mochilero: 2,
  comfort:   4,
  premium:   4,
};

const PRICE_CAP_CLP: Record<string, number> = {
  mochilero:  80_000,
  comfort:   200_000,
  premium:   500_000,
};

// ── Neighborhood intelligence ─────────────────────────────────────────────────
// Best tourist neighborhoods per city and travel style.
// Searching "Palermo Buenos Aires hotels" returns far better candidates
// than "Buenos Aires hotels" — Google Hotels respects location context.
const IDEAL_NEIGHBORHOODS: Record<string, Record<string, string>> = {
  // LATAM
  "buenos aires": { mochilero: "San Telmo Buenos Aires",     comfort: "Palermo Buenos Aires",        premium: "Recoleta Buenos Aires" },
  "lima":         { mochilero: "Miraflores Lima",            comfort: "Miraflores Lima",              premium: "San Isidro Lima" },
  "bogota":       { mochilero: "La Candelaria Bogotá",       comfort: "Zona Rosa Bogotá",             premium: "Chicó Bogotá" },
  "bogotá":       { mochilero: "La Candelaria Bogotá",       comfort: "Zona Rosa Bogotá",             premium: "Chicó Bogotá" },
  "ciudad de mexico": { mochilero: "Roma Norte Ciudad de México", comfort: "Condesa Ciudad de México", premium: "Polanco Ciudad de México" },
  "mexico city":  { mochilero: "Roma Norte Mexico City",     comfort: "Condesa Mexico City",          premium: "Polanco Mexico City" },
  "santiago":     { mochilero: "Barrio Italia Santiago",     comfort: "Providencia Santiago",         premium: "Las Condes Santiago" },
  "rio de janeiro":{ mochilero: "Santa Teresa Rio de Janeiro", comfort: "Ipanema Rio de Janeiro",    premium: "Leblon Rio de Janeiro" },
  "sao paulo":    { mochilero: "Vila Madalena São Paulo",    comfort: "Jardins São Paulo",            premium: "Itaim Bibi São Paulo" },
  "são paulo":    { mochilero: "Vila Madalena São Paulo",    comfort: "Jardins São Paulo",            premium: "Itaim Bibi São Paulo" },
  "montevideo":   { mochilero: "Ciudad Vieja Montevideo",    comfort: "Pocitos Montevideo",           premium: "Carrasco Montevideo" },
  "cartagena":    { mochilero: "Getsemaní Cartagena",        comfort: "Centro Histórico Cartagena",   premium: "Bocagrande Cartagena" },
  "medellin":     { mochilero: "El Poblado Medellín",        comfort: "El Poblado Medellín",          premium: "El Poblado Medellín" },
  "medellín":     { mochilero: "El Poblado Medellín",        comfort: "El Poblado Medellín",          premium: "El Poblado Medellín" },
  "cusco":        { mochilero: "Centro Histórico Cusco",     comfort: "Centro Histórico Cusco",       premium: "San Blas Cusco" },
  "la paz":       { mochilero: "Sopocachi La Paz",           comfort: "Sopocachi La Paz",             premium: "Zona Sur La Paz" },
  "quito":        { mochilero: "La Mariscal Quito",          comfort: "La Mariscal Quito",            premium: "González Suárez Quito" },
  "asuncion":     { mochilero: "Centro Asunción",            comfort: "Villa Morra Asunción",         premium: "Carmelitas Asunción" },
  "asunción":     { mochilero: "Centro Asunción",            comfort: "Villa Morra Asunción",         premium: "Carmelitas Asunción" },
  "panama city":  { mochilero: "Casco Viejo Panamá",        comfort: "Marbella Panamá",              premium: "Punta Pacífica Panamá" },
  "ciudad de panama": { mochilero: "Casco Viejo Panamá",    comfort: "Marbella Panamá",              premium: "Punta Pacífica Panamá" },
  "san jose":     { mochilero: "Barrio Escalante San José",  comfort: "Escazú San José",              premium: "Escazú San José" },
  "havana":       { mochilero: "La Habana Vieja",            comfort: "Vedado La Habana",             premium: "Miramar La Habana" },
  "la habana":    { mochilero: "La Habana Vieja",            comfort: "Vedado La Habana",             premium: "Miramar La Habana" },
  // Europe
  "madrid":       { mochilero: "Malasaña Madrid",            comfort: "Chueca Madrid",                premium: "Barrio Salamanca Madrid" },
  "barcelona":    { mochilero: "El Raval Barcelona",         comfort: "Eixample Barcelona",           premium: "Gràcia Barcelona" },
  "paris":        { mochilero: "Bastille Paris",             comfort: "Le Marais Paris",              premium: "Saint-Germain-des-Prés Paris" },
  "rome":         { mochilero: "Trastevere Rome",            comfort: "Centro Storico Rome",          premium: "Parioli Rome" },
  "roma":         { mochilero: "Trastevere Roma",            comfort: "Centro Storico Roma",          premium: "Parioli Roma" },
  "amsterdam":    { mochilero: "Jordaan Amsterdam",          comfort: "Canal Ring Amsterdam",         premium: "Museum Quarter Amsterdam" },
  "lisbon":       { mochilero: "Mouraria Lisbon",            comfort: "Chiado Lisbon",                premium: "Príncipe Real Lisbon" },
  "lisboa":       { mochilero: "Mouraria Lisboa",            comfort: "Chiado Lisboa",                premium: "Príncipe Real Lisboa" },
  "prague":       { mochilero: "Žižkov Prague",              comfort: "Vinohrady Prague",             premium: "Staré Město Prague" },
  "praga":        { mochilero: "Žižkov Praga",               comfort: "Vinohrady Praga",              premium: "Staré Město Praga" },
  "vienna":       { mochilero: "Neubau Vienna",              comfort: "Innere Stadt Vienna",          premium: "Innere Stadt Vienna" },
  "viena":        { mochilero: "Neubau Viena",               comfort: "Innere Stadt Viena",           premium: "Innere Stadt Viena" },
  "berlin":       { mochilero: "Kreuzberg Berlin",           comfort: "Mitte Berlin",                 premium: "Charlottenburg Berlin" },
  "london":       { mochilero: "Shoreditch London",          comfort: "Covent Garden London",         premium: "Kensington London" },
  "londres":      { mochilero: "Shoreditch Londres",         comfort: "Covent Garden Londres",        premium: "Kensington Londres" },
  "florence":     { mochilero: "Oltrarno Florence",          comfort: "Centro Storico Florence",      premium: "Centro Storico Florence" },
  "florencia":    { mochilero: "Oltrarno Florencia",         comfort: "Centro Storico Florencia",     premium: "Centro Storico Florencia" },
  "venice":       { mochilero: "Cannaregio Venice",          comfort: "San Marco Venice",             premium: "San Marco Venice" },
  "venecia":      { mochilero: "Cannaregio Venecia",         comfort: "San Marco Venecia",            premium: "San Marco Venecia" },
  "milan":        { mochilero: "Navigli Milan",              comfort: "Brera Milan",                  premium: "Quadrilatero della Moda Milan" },
  "milán":        { mochilero: "Navigli Milán",              comfort: "Brera Milán",                  premium: "Quadrilatero della Moda Milán" },
  "athens":       { mochilero: "Monastiraki Athens",         comfort: "Kolonaki Athens",              premium: "Kolonaki Athens" },
  "atenas":       { mochilero: "Monastiraki Atenas",         comfort: "Kolonaki Atenas",              premium: "Kolonaki Atenas" },
  "istanbul":     { mochilero: "Sultanahmet Istanbul",       comfort: "Beyoğlu Istanbul",             premium: "Nişantaşı Istanbul" },
  "estambul":     { mochilero: "Sultanahmet Estambul",       comfort: "Beyoğlu Estambul",             premium: "Nişantaşı Estambul" },
  "porto":        { mochilero: "Bonfim Porto",               comfort: "Ribeira Porto",                premium: "Foz do Douro Porto" },
  "seville":      { mochilero: "Triana Sevilla",             comfort: "Centro Sevilla",               premium: "Centro Sevilla" },
  "sevilla":      { mochilero: "Triana Sevilla",             comfort: "Centro Sevilla",               premium: "Centro Sevilla" },
  "copenhagen":   { mochilero: "Nørrebro Copenhagen",        comfort: "Indre By Copenhagen",          premium: "Frederiksberg Copenhagen" },
  "copenhague":   { mochilero: "Nørrebro Copenhague",        comfort: "Indre By Copenhague",          premium: "Frederiksberg Copenhague" },
  // North America
  "new york":     { mochilero: "Brooklyn New York",          comfort: "Chelsea Manhattan New York",   premium: "Upper East Side New York" },
  "nueva york":   { mochilero: "Brooklyn Nueva York",        comfort: "Chelsea Manhattan Nueva York", premium: "Upper East Side Nueva York" },
  "miami":        { mochilero: "Wynwood Miami",              comfort: "South Beach Miami",            premium: "Brickell Miami" },
  "los angeles":  { mochilero: "Silver Lake Los Angeles",    comfort: "Santa Monica Los Angeles",     premium: "Beverly Hills Los Angeles" },
  "chicago":      { mochilero: "Wicker Park Chicago",        comfort: "River North Chicago",          premium: "Gold Coast Chicago" },
  "san francisco":{ mochilero: "Mission District San Francisco", comfort: "Union Square San Francisco", premium: "Pacific Heights San Francisco" },
  "cancun":       { mochilero: "Centro Cancún",              comfort: "Zona Hotelera Cancún",         premium: "Zona Hotelera Cancún" },
  "cancún":       { mochilero: "Centro Cancún",              comfort: "Zona Hotelera Cancún",         premium: "Zona Hotelera Cancún" },
  // Asia & Pacific
  "tokyo":        { mochilero: "Asakusa Tokyo",              comfort: "Shinjuku Tokyo",               premium: "Omotesando Tokyo" },
  "tokio":        { mochilero: "Asakusa Tokio",              comfort: "Shinjuku Tokio",               premium: "Omotesando Tokio" },
  "bangkok":      { mochilero: "Banglamphu Bangkok",         comfort: "Sukhumvit Bangkok",            premium: "Silom Bangkok" },
  "singapore":    { mochilero: "Little India Singapore",     comfort: "Marina Bay Singapore",         premium: "Orchard Road Singapore" },
  "singapur":     { mochilero: "Little India Singapur",      comfort: "Marina Bay Singapur",          premium: "Orchard Road Singapur" },
  "bali":         { mochilero: "Canggu Bali",                comfort: "Seminyak Bali",                premium: "Ubud Bali" },
  "dubai":        { mochilero: "Deira Dubai",                comfort: "Downtown Dubai",               premium: "Palm Jumeirah Dubai" },
  "sydney":       { mochilero: "Newtown Sydney",             comfort: "Darlinghurst Sydney",          premium: "Circular Quay Sydney" },
  "melbourne":    { mochilero: "Fitzroy Melbourne",          comfort: "CBD Melbourne",                premium: "South Yarra Melbourne" },
};

function getSearchQuery(city: string, travelStyle: string): string {
  const key = city.toLowerCase().trim();
  const neighborhoods = IDEAL_NEIGHBORHOODS[key];
  if (neighborhoods) return neighborhoods[travelStyle] ?? neighborhoods.comfort ?? city;
  return city;
}

// ── SerpAPI types ─────────────────────────────────────────────────────────────
interface SerpHotel {
  name: string;
  overall_rating?: number;
  reviews?: number;
  stars?: number;
  rate_per_night?: { extracted_lowest?: number };
  amenities?: string[];
  link?: string;
}

// ── Sonnet validation of top candidates ──────────────────────────────────────
interface HotelCandidate {
  index: number;
  name: string;
  neighborhood: string;
  stars: number;
  rating: number;
  reviews: number;
  priceUsdPerNight: number;
  amenities: string[];
}

async function validateWithSonnet(
  candidates: HotelCandidate[],
  city: string,
  travelStyle: string
): Promise<{ winnerIndex: number; reason: string }> {
  const client = new Anthropic();
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `Eres experto en viajes en 2026. Para un viajero estilo "${travelStyle}" visitando ${city}, elige el mejor hotel considerando: ubicación para turistas, reputación del barrio, relación calidad-precio y comodidad según el estilo de viaje.

Candidatos:
${JSON.stringify(candidates, null, 2)}

Responde SOLO con JSON válido: {"winner": <índice 0-${candidates.length - 1}>, "reason": "<1-2 oraciones en español explicando por qué este hotel gana, sé específico con el barrio y los números>"}`,
      }],
    });
    const text = (msg.content[0] as { type: string; text: string }).text;
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned) as { winner: number; reason: string };
    const idx = parsed.winner;
    if (typeof idx === "number" && idx >= 0 && idx < candidates.length) {
      return { winnerIndex: idx, reason: parsed.reason ?? "" };
    }
  } catch {
    // fall through to default
  }
  return { winnerIndex: 0, reason: "" };
}

// ── Main scrape + score + validate ───────────────────────────────────────────
async function scrapeCity(
  city: string,
  checkIn: string,
  checkOut: string,
  adults: number,
  travelStyle: string
): Promise<HotelRecommendation | null> {
  if (!SERPAPI_KEY) return null;

  // Use neighborhood-aware query for better candidates
  const searchQuery = getSearchQuery(city, travelStyle);

  const params = new URLSearchParams({
    engine:         "google_hotels",
    q:              searchQuery,
    check_in_date:  checkIn,
    check_out_date: checkOut,
    adults:         String(adults),
    currency:       "USD",
    gl:             "us",
    hl:             "es",
    num:            "40",
    sort_by:        "8",
    api_key:        SERPAPI_KEY,
  });

  if (travelStyle === "mochilero") params.set("max_price", "90");
  else if (travelStyle === "comfort") params.set("max_price", "220");
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

  let pool = data.properties.filter(h => h.rate_per_night?.extracted_lowest && h.name);
  if (!pool.length) return null;

  // Stars filter
  const minStars = MIN_STARS[travelStyle] ?? 2;
  const starFiltered = pool.filter(h => (h.stars ?? 0) >= minStars);
  if (starFiltered.length >= 1) pool = starFiltered;

  // Price cap
  const capClp = PRICE_CAP_CLP[travelStyle];
  if (capClp && pool.length >= 2) {
    const capped = pool.filter(h =>
      Math.round((h.rate_per_night!.extracted_lowest!) * USD_TO_CLP) <= capClp
    );
    if (capped.length >= 1) pool = capped;
  }

  // Score and take top 3
  const scored = pool
    .map(h => {
      const priceClp = Math.round((h.rate_per_night!.extracted_lowest!) * USD_TO_CLP);
      const rating   = h.overall_rating ?? 7.5;
      const reviews  = h.reviews ?? 0;
      return { h, priceClp, score: hotelScore(priceClp, rating, reviews, travelStyle) };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  // Build candidates for Sonnet validation
  const candidates: HotelCandidate[] = scored.map((s, i) => ({
    index: i,
    name: s.h.name,
    neighborhood: searchQuery,
    stars: s.h.stars ?? 0,
    rating: s.h.overall_rating ?? 0,
    reviews: s.h.reviews ?? 0,
    priceUsdPerNight: Math.round(s.priceClp / USD_TO_CLP),
    amenities: (s.h.amenities ?? []).slice(0, 6),
  }));

  // Validate with Sonnet — geographic + cultural intelligence
  const { winnerIndex, reason } = candidates.length > 1
    ? await validateWithSonnet(candidates, city, travelStyle)
    : { winnerIndex: 0, reason: "" };

  const { h: winner, priceClp } = scored[winnerIndex] ?? scored[0];

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
    neighborhood: searchQuery,
    stars,
    pricePerNightClp: priceClp,
    rating,
    reviews,
    style: stars >= 5 ? "boutique" : stars >= 4 ? "business" : "hostal",
    pros,
    cons,
    bookingSearchUrl: winner.link
      ?? `https://www.google.com/travel/hotels/entity?q=${encodeURIComponent(winner.name + " " + city)}&checkin=${checkIn}&checkout=${checkOut}&adults=${adults}`,
    selectionReason: reason || undefined,
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
