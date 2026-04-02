import { NextRequest, NextResponse } from "next/server";
import type { FlightOption } from "@/types/trip";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_ACTOR_ID = "1dYHRKkEBHBPd0JM7";

// Airline booking deep links — pre-filled with route + date
const AIRLINE_URLS: Record<string, (f: string, t: string, d: string, n: number) => string> = {
  LA: (f, t, d, n) => `https://www.latamairlines.com/cl/es/oferta-vuelos?origin=${f}&destination=${t}&outbound=${d}&adults=${n}&cabin=Y&trip=OW`,
  H2: (f, t, d, n) => `https://www.skyairline.com/vuelos?from=${f}&to=${t}&date=${d}&adults=${n}`,
  JA: (f, t, d, n) => `https://jetsmart.com/cl/es/vuelos?origin=${f}&destination=${t}&departure=${d}&adults=${n}&trip=OW`,
  AR: (f, t, d, n) => `https://www.aerolineas.com.ar/es-ar/vuelos?from=${f}&to=${t}&departure=${d}&cabin=Y&adults=${n}`,
  G3: (f, t, d, n) => `https://www.golairlines.com.br/voos?from=${f}&to=${t}&date=${d}&adults=${n}`,
  AA: (f, t, d, n) => `https://www.aa.com/booking/find-flights?origin=${f}&destination=${t}&departureDate=${d}&numberOfAdults=${n}&cabin=COACH`,
  UA: (f, t, d, n) => `https://www.united.com/es/cl/fsr/choose-flights?f=${f}&t=${t}&d=${d}&px=${n}&sc=7`,
  CM: (f, t, d, n) => `https://www.copaair.com/es-cl/vuelos/${f}-${t}/?departureDate=${d}&adults=${n}&cabin=Y`,
  AV: (f, t, d, n) => `https://www.avianca.com/cl/es/vuelos/?originAirportCode=${f}&destinationAirportCode=${t}&departureDate=${d}&adults=${n}&tripType=OW`,
  IB: (f, t, d, n) => `https://www.iberia.com/vuelos/?from=${f}&to=${t}&departure=${d}&adults=${n}&cabin=Y&tripType=OW`,
};

function airlineUrl(code: string, fromIata: string, toIata: string, date: string, adults: number): string {
  const builder = AIRLINE_URLS[code?.toUpperCase()];
  if (builder) return builder(fromIata, toIata, date, adults);
  return `https://www.google.com/travel/flights#flt=${fromIata}.${toIata}.${date};c:CLP;e:${adults};sd:1;t:f`;
}

function carrierCodeFromAirline(airline: string): string {
  const name = airline.toLowerCase();
  if (name.includes("latam")) return "LA";
  if (name.includes("sky")) return "H2";
  if (name.includes("jetsmart")) return "JA";
  if (name.includes("aerolíneas") || name.includes("aerolineas")) return "AR";
  if (name.includes("gol")) return "G3";
  if (name.includes("american")) return "AA";
  if (name.includes("united")) return "UA";
  if (name.includes("copa")) return "CM";
  if (name.includes("avianca")) return "AV";
  if (name.includes("iberia")) return "IB";
  return "";
}

// USD to CLP approximate rate
const USD_TO_CLP = 950;

interface ApifyFlight {
  departure_airport?: { id?: string; time?: string };
  arrival_airport?: { id?: string; time?: string };
  duration?: number;
  airline?: string;
  airplane?: string;
  flight_number?: string;
  legroom?: string;
  often_delayed_by_over_30_min?: boolean;
}

interface ApifyFlightGroup {
  flights?: ApifyFlight[];
  price?: number;
  total_duration?: number;
  carbon_emissions?: unknown;
}

interface ApifyResult {
  best_flights?: ApifyFlightGroup[];
  other_flights?: ApifyFlightGroup[];
}

function parseTime(isoOrTime?: string): string {
  if (!isoOrTime) return "00:00";
  // Could be "2025-06-15 07:30" or "07:30" or "2025-06-15T07:30:00"
  const match = isoOrTime.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "00:00";
}

function buildFlightOptions(
  groups: ApifyFlightGroup[],
  fromIata: string,
  toIata: string,
  date: string,
  adults: number,
  allPrices: number[]
): FlightOption[] {
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);

  return groups.flatMap(group => {
    const flights = group.flights ?? [];
    if (flights.length === 0) return [];

    const firstFlight = flights[0];
    const lastFlight = flights[flights.length - 1];

    const airline = firstFlight.airline ?? "Aerolínea";
    const carrierCode = carrierCodeFromAirline(airline);
    const flightNumber = firstFlight.flight_number ?? undefined;
    const departure = parseTime(firstFlight.departure_airport?.time);
    const arrival = parseTime(lastFlight.arrival_airport?.time);
    const durationMin = group.total_duration ?? (firstFlight.duration ?? 0);
    const stops = flights.length - 1;
    // price from Apify is in USD per person
    const priceClp = Math.round((group.price ?? 0) * USD_TO_CLP * adults);

    const pros: string[] = [];
    const cons: string[] = [];

    if (stops === 0) pros.push("Vuelo directo, sin escalas");
    else cons.push(`${stops} escala${stops > 1 ? "s" : ""}`);

    if (allPrices.length > 1) {
      if (priceClp <= (minP + (maxP - minP) * 0.2)) pros.push("El más económico");
      else if (priceClp >= (maxP - (maxP - minP) * 0.2)) cons.push("El más caro");
    }

    const depH = parseInt(departure.split(":")[0]);
    if (depH >= 6 && depH <= 9) pros.push("Sale temprano — llegas con el día completo");
    else if (depH >= 20 || depH < 5) pros.push("Vuelo nocturno — no pierdes días de viaje");
    else if (depH >= 13 && depH <= 17) cons.push("Sale al mediodía, llegas en la tarde");

    if (durationMin > 0 && durationMin <= 100) {
      const h = Math.floor(durationMin / 60);
      const m = durationMin % 60;
      pros.push(`Vuelo corto (${h}h${m ? m + "m" : ""})`);
    }

    if (firstFlight.often_delayed_by_over_30_min) cons.push("Suele tener retrasos de +30 min");
    if (firstFlight.legroom) pros.push(`Espacio para piernas: ${firstFlight.legroom}`);

    if (pros.length === 0) pros.push("Aerolínea con trayectoria en la ruta");
    if (cons.length === 0) cons.push("Verifica si incluye equipaje de bodega");

    return [{
      airline,
      flightNumber,
      departure,
      arrival,
      durationMin,
      stops,
      priceClp,
      pros,
      cons,
      bookingSearchUrl: airlineUrl(carrierCode, fromIata, toIata, date, adults),
    } satisfies FlightOption];
  });
}

interface FlightLeg {
  fromCity: string;
  toCity: string;
  fromIata?: string;
  toIata?: string;
  date?: string;
}

async function fetchLegFlights(
  fromIata: string,
  toIata: string,
  date: string,
  adults: number
): Promise<FlightOption[]> {
  if (!APIFY_TOKEN) {
    console.error("[flights] APIFY_TOKEN not set");
    return [];
  }

  const url = `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=50`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      departure_id: fromIata,
      arrival_id: toIata,
      outbound_date: date,
      adults,
      currency: "USD",
      hl: "en",
      gl: "us",
      exclude_basic: false,
      max_pages: 1,
    }),
    signal: AbortSignal.timeout(55000),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[flights] Apify error ${response.status}:`, body.slice(0, 200));
    return [];
  }

  const data = (await response.json()) as ApifyResult[];
  const result = data?.[0];

  if (!result) return [];

  const bestGroups = result.best_flights ?? [];
  const otherGroups = result.other_flights ?? [];
  const allGroups = [...bestGroups, ...otherGroups].slice(0, 6);

  // Collect all prices for relative comparison
  const allPrices = allGroups
    .map(g => Math.round((g.price ?? 0) * USD_TO_CLP * adults))
    .filter(p => p > 0);

  if (allPrices.length === 0) return [];

  return buildFlightOptions(allGroups, fromIata, toIata, date, adults, allPrices);
}

export async function POST(req: NextRequest) {
  const { legs, adults } = await req.json() as { legs: FlightLeg[]; adults: number };
  const flightOptions: Record<string, FlightOption[]> = {};

  // Fetch all legs in parallel
  await Promise.all(legs.map(async leg => {
    const key = `${leg.fromCity}-${leg.toCity}`;
    if (!leg.fromIata || !leg.toIata || !leg.date) {
      flightOptions[key] = [];
      return;
    }
    try {
      console.log(`[flights] fetching ${key} (${leg.fromIata}→${leg.toIata} ${leg.date})`);
      flightOptions[key] = await fetchLegFlights(leg.fromIata, leg.toIata, leg.date, adults);
      console.log(`[flights] ${key}: ${flightOptions[key].length} options found`);
    } catch (e) {
      console.error(`[flights] ${key} failed:`, e instanceof Error ? e.message : e);
      flightOptions[key] = [];
    }
  }));

  return NextResponse.json({ flightOptions });
}
