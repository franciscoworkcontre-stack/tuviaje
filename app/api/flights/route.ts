import { NextRequest, NextResponse } from "next/server";
import type { FlightOption } from "@/types/trip";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

// Airline booking URL templates — pre-filled with route + date so user lands directly on results
const AIRLINE_URLS: Record<string, (from: string, to: string, date: string, adults: number) => string> = {
  LA: (f, t, d, n) => `https://www.latamairlines.com/cl/es/oferta-vuelos?origin=${f}&destination=${t}&outbound=${d}&adults=${n}&cabin=Y&trip=OW`,
  JJ: (f, t, d, n) => `https://www.latamairlines.com/br/pt/oferta-voos?origin=${f}&destination=${t}&outbound=${d}&adults=${n}&cabin=Y&trip=OW`,
  H2: (f, t, d, n) => `https://www.skyairline.com/vuelos?from=${f}&to=${t}&date=${d}&adults=${n}`,
  JA: (f, t, d, n) => `https://jetsmart.com/cl/es/vuelos?origin=${f}&destination=${t}&departure=${d}&adults=${n}&trip=OW`,
  AR: (f, t, d, n) => `https://www.aerolineas.com.ar/es-ar/vuelos?from=${f}&to=${t}&departure=${d}&cabin=Y&adults=${n}`,
  G3: (f, t, d, n) => `https://www.golairlines.com.br/voos?from=${f}&to=${t}&date=${d}&adults=${n}`,
  AA: (f, t, d, n) => `https://www.aa.com/booking/find-flights?origin=${f}&destination=${t}&departureDate=${d}&numberOfAdults=${n}&cabin=COACH&locale=es_CL`,
  UA: (f, t, d, n) => `https://www.united.com/es/cl/fsr/choose-flights?f=${f}&t=${t}&d=${d}&px=${n}&sc=7&st=bestmatches`,
  IB: (f, t, d, n) => `https://www.iberia.com/vuelos/?from=${f}&to=${t}&departure=${d}&adults=${n}&children=0&infants=0&cabin=Y&tripType=OW`,
  CM: (f, t, d, n) => `https://www.copaair.com/es-cl/vuelos/${f}-${t}/?departureDate=${d}&adults=${n}&cabin=Y`,
};

function buildAirlineUrl(carrierCode: string, fromIata: string, toIata: string, date: string, adults: number): string {
  const builder = AIRLINE_URLS[carrierCode];
  if (builder) return builder(fromIata, toIata, date, adults);
  // Fallback: Google Flights pre-filtered
  return `https://www.google.com/travel/flights#flt=${fromIata}.${toIata}.${date};c:CLP;e:${adults};sd:1;t:f`;
}

function parseDuration(iso: string): number {
  // PT2H40M → 160 minutes
  const hrs = iso.match(/(\d+)H/)?.[1] ?? "0";
  const mins = iso.match(/(\d+)M/)?.[1] ?? "0";
  return parseInt(hrs) * 60 + parseInt(mins);
}

function generateProscons(opt: {
  stops: number;
  durationMin: number;
  priceClp: number;
  departure: string;
  airline: string;
}, allPrices: number[]): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);

  if (opt.stops === 0) pros.push("Vuelo directo, sin escalas");
  else cons.push(`${opt.stops} escala — más tiempo de viaje`);

  const depHour = parseInt(opt.departure.split(":")[0]);
  if (depHour >= 6 && depHour <= 9) pros.push("Sale temprano, llegas con el día completo");
  else if (depHour >= 20 || depHour < 6) pros.push("Vuelo nocturno — no pierdes un día");
  else if (depHour >= 12 && depHour <= 15) cons.push("Horario de mediodía, llegas en la tarde");

  if (opt.priceClp <= minPrice + (maxPrice - minPrice) * 0.33) pros.push("Precio más bajo de las opciones");
  else if (opt.priceClp >= maxPrice - (maxPrice - minPrice) * 0.33) cons.push("Precio más alto de las opciones");

  if (opt.durationMin <= 120) pros.push(`Vuelo corto: ${Math.floor(opt.durationMin / 60)}h${opt.durationMin % 60 > 0 ? opt.durationMin % 60 + "m" : ""}`);

  if (pros.length === 0) pros.push("Aerolínea reconocida en la ruta");
  if (cons.length === 0) cons.push("Confirma equipaje incluido antes de comprar");

  return { pros, cons };
}

const AMADEUS_KEY = process.env.AMADEUS_API_KEY;
const AMADEUS_SECRET = process.env.AMADEUS_API_SECRET;
// Use test environment by default, switch to production when ready
const AMADEUS_BASE = process.env.AMADEUS_ENV === "production"
  ? "https://api.amadeus.com"
  : "https://test.api.amadeus.com";

// CLP/USD exchange rate (update periodically or use a free rate API)
const USD_TO_CLP = parseInt(process.env.USD_TO_CLP ?? "920");

async function getAmadeusToken(): Promise<string> {
  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${AMADEUS_KEY}&client_secret=${AMADEUS_SECRET}`,
  });
  if (!res.ok) throw new Error(`Amadeus auth failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

interface FlightLeg {
  fromCity: string;
  toCity: string;
  fromIata?: string;
  toIata?: string;
  date?: string;
}

interface AmadeusOffer {
  price: { total: string; currency: string };
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
      carrierCode: string;
      number: string;
      numberOfStops: number;
    }>;
  }>;
  validatingAirlineCodes?: string[];
}

async function searchAmadeusFlights(
  fromIata: string, toIata: string, date: string, adults: number, token: string
): Promise<FlightOption[]> {
  const params = new URLSearchParams({
    originLocationCode: fromIata,
    destinationLocationCode: toIata,
    departureDate: date,
    adults: String(adults),
    max: "5",
    currencyCode: "USD",
    nonStop: "false",
  });

  const res = await fetch(`${AMADEUS_BASE}/v2/shopping/flight-offers?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Amadeus search failed: ${res.status}`);
  const data = await res.json() as { data: AmadeusOffer[] };

  const options: Omit<FlightOption, "pros" | "cons">[] = (data.data ?? []).map((offer) => {
    const itin = offer.itineraries[0];
    const firstSeg = itin.segments[0];
    const lastSeg = itin.segments[itin.segments.length - 1];
    const carrierCode = offer.validatingAirlineCodes?.[0] ?? firstSeg.carrierCode;
    const depTime = firstSeg.departure.at.slice(11, 16); // HH:MM
    const arrTime = lastSeg.arrival.at.slice(11, 16);
    const durationMin = parseDuration(itin.duration);
    const stops = itin.segments.length - 1;
    const priceUsd = parseFloat(offer.price.total);
    const priceClp = Math.round(priceUsd * USD_TO_CLP / 100) * 100; // round to nearest 100

    // Get airline name from IATA carrier code
    const AIRLINE_NAMES: Record<string, string> = {
      LA: "LATAM", JJ: "LATAM Brasil", H2: "Sky Airline", JA: "JetSMART",
      AR: "Aerolíneas Argentinas", G3: "Gol", AA: "American Airlines",
      UA: "United Airlines", IB: "Iberia", CM: "Copa Airlines",
      AV: "Avianca", DL: "Delta", KL: "KLM", AF: "Air France",
    };

    return {
      airline: AIRLINE_NAMES[carrierCode] ?? carrierCode,
      flightNumber: `${firstSeg.carrierCode}${firstSeg.number}`,
      departure: depTime,
      arrival: arrTime,
      durationMin,
      stops,
      priceClp,
      bookingSearchUrl: buildAirlineUrl(carrierCode, fromIata, toIata, date, adults),
    };
  });

  // Add pros/cons based on comparison across all options
  const prices = options.map(o => o.priceClp);
  return options.map(opt => ({
    ...opt,
    ...generateProscons({ ...opt, departure: opt.departure, airline: opt.airline }, prices),
  }));
}

export async function POST(req: NextRequest) {
  const { legs, adults } = await req.json() as { legs: FlightLeg[]; travelStyle: string; adults: number };

  // Check if Amadeus is configured
  if (!AMADEUS_KEY || !AMADEUS_SECRET) {
    return NextResponse.json(
      { error: "Amadeus API not configured. Add AMADEUS_API_KEY and AMADEUS_API_SECRET to env vars." },
      { status: 503 }
    );
  }

  try {
    const token = await getAmadeusToken();

    const results = await Promise.all(
      legs.map(async (leg) => {
        const key = `${leg.fromCity}-${leg.toCity}`;
        if (!leg.fromIata || !leg.toIata || !leg.date) {
          return [key, [] as FlightOption[]] as const;
        }
        try {
          const opts = await searchAmadeusFlights(leg.fromIata, leg.toIata, leg.date, adults, token);
          return [key, opts] as const;
        } catch (e) {
          console.error(`[flights] leg ${key} failed:`, e);
          return [key, [] as FlightOption[]] as const;
        }
      })
    );

    const flightOptions = Object.fromEntries(results);
    return NextResponse.json({ flightOptions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[flights]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
