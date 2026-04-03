import type { FlightOption } from "@/types/trip";

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const USD_TO_CLP = 950;

// ── Airline booking URL builders ──────────────────────────────────────────────
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
  if (name.includes("latam"))    return "LA";
  if (name.includes("sky"))      return "H2";
  if (name.includes("jetsmart")) return "JA";
  if (name.includes("aerolíneas") || name.includes("aerolineas")) return "AR";
  if (name.includes("gol"))      return "G3";
  if (name.includes("american")) return "AA";
  if (name.includes("united"))   return "UA";
  if (name.includes("copa"))     return "CM";
  if (name.includes("avianca"))  return "AV";
  if (name.includes("iberia"))   return "IB";
  return "";
}

function parseTime(isoOrTime?: string): string {
  if (!isoOrTime) return "00:00";
  const match = isoOrTime.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "00:00";
}

// ── SerpAPI response types ────────────────────────────────────────────────────
interface SerpFlight {
  departure_airport?: { id?: string; time?: string };
  arrival_airport?:   { id?: string; time?: string };
  duration?:          number;
  airline?:           string;
  flight_number?:     string;
  legroom?:           string;
  often_delayed_by_over_30_min?: boolean;
  extensions?: string[];
}

interface SerpFlightGroup {
  flights?:         SerpFlight[];
  price?:           number; // USD per person
  total_duration?:  number;
}

interface SerpFlightsResult {
  best_flights?:  SerpFlightGroup[];
  other_flights?: SerpFlightGroup[];
  error?:         string;
}

// ── Map SerpAPI groups → FlightOption[] ──────────────────────────────────────
function buildFlightOptions(
  groups:   SerpFlightGroup[],
  fromIata: string,
  toIata:   string,
  date:     string,
  adults:   number,
  allPricesClp: number[]
): FlightOption[] {
  const minP = Math.min(...allPricesClp);
  const maxP = Math.max(...allPricesClp);

  return groups.flatMap(group => {
    const flights = group.flights ?? [];
    if (!flights.length || !group.price) return [];

    const first   = flights[0];
    const last    = flights[flights.length - 1];
    const airline = first.airline ?? "Aerolínea";
    const code    = carrierCodeFromAirline(airline);

    const departure  = parseTime(first.departure_airport?.time);
    const arrival    = parseTime(last.arrival_airport?.time);
    const durationMin = group.total_duration ?? first.duration ?? 0;
    const stops      = flights.length - 1;

    // SerpAPI returns price per person in USD
    const priceClp = Math.round(group.price * USD_TO_CLP * adults);

    const pros: string[] = [];
    const cons: string[] = [];

    if (stops === 0) pros.push("Vuelo directo, sin escalas");
    else             cons.push(`${stops} escala${stops > 1 ? "s" : ""}`);

    if (allPricesClp.length > 1) {
      const range = maxP - minP;
      if (priceClp <= minP + range * 0.2)  pros.push("El más económico");
      else if (priceClp >= maxP - range * 0.2) cons.push("El más caro");
    }

    const depH = parseInt(departure.split(":")[0]);
    if      (depH >= 6  && depH <= 9)  pros.push("Sale temprano — llegas con el día completo");
    else if (depH >= 20 || depH < 5)   pros.push("Vuelo nocturno — no pierdes días de viaje");
    else if (depH >= 13 && depH <= 17) cons.push("Sale al mediodía, llegas en la tarde");

    if (durationMin > 0 && durationMin <= 100) {
      const h = Math.floor(durationMin / 60);
      const m = durationMin % 60;
      pros.push(`Vuelo corto (${h}h${m ? m + "m" : ""})`);
    }

    if (first.often_delayed_by_over_30_min) cons.push("Suele tener retrasos de +30 min");
    if (first.legroom) pros.push(`Espacio para piernas: ${first.legroom}`);
    if (!pros.length)  pros.push("Aerolínea con trayectoria en la ruta");
    if (!cons.length)  cons.push("Verifica si incluye equipaje de bodega");

    return [{
      airline,
      flightNumber: first.flight_number,
      departure,
      arrival,
      durationMin,
      stops,
      priceClp,
      pros,
      cons,
      bookingSearchUrl: airlineUrl(code, fromIata, toIata, date, adults),
    } satisfies FlightOption];
  });
}

// ── Single leg via SerpAPI ────────────────────────────────────────────────────
export async function fetchLegFlights(
  fromIata: string,
  toIata:   string,
  date:     string,
  adults:   number
): Promise<FlightOption[]> {
  if (!SERPAPI_KEY || !fromIata || !toIata || !date) return [];

  const params = new URLSearchParams({
    engine:         "google_flights",
    departure_id:   fromIata,
    arrival_id:     toIata,
    outbound_date:  date,
    type:           "2",        // one-way
    adults:         "1",        // per-person price — we multiply by adults ourselves
    currency:       "USD",
    hl:             "es",
    gl:             "us",
    api_key:        SERPAPI_KEY,
  });

  let data: SerpFlightsResult;
  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    data = await res.json();
  } catch {
    return [];
  }

  if (data.error) {
    console.error("SerpAPI flights error:", data.error);
    return [];
  }

  const allGroups = [
    ...(data.best_flights  ?? []),
    ...(data.other_flights ?? []),
  ].slice(0, 6);

  if (!allGroups.length) return [];

  const allPricesClp = allGroups
    .map(g => Math.round((g.price ?? 0) * USD_TO_CLP * adults))
    .filter(p => p > 0);
  if (!allPricesClp.length) return [];

  const options = buildFlightOptions(allGroups, fromIata, toIata, date, adults, allPricesClp)
    .filter(o => o.priceClp > 0);
  if (!options.length) return [];

  // Direct flights first, then by price asc
  const direct  = options.filter(o => o.stops === 0).sort((a, b) => a.priceClp - b.priceClp);
  const connect = options.filter(o => o.stops > 0).sort((a, b) => a.priceClp - b.priceClp);
  const sorted  = direct.length ? [...direct, ...connect] : connect;

  if (sorted[0]) {
    const label = sorted[0].stops === 0 ? "⭐ Más barato directo" : "⭐ Más económico disponible";
    sorted[0].pros = [label, ...sorted[0].pros];
  }

  return sorted;
}

// ── Round-trip: returns best combined price in CLP (both directions) ─────────
export async function fetchRoundTripBestPrice(
  fromIata:   string,
  toIata:     string,
  outDate:    string,
  returnDate: string,
  adults:     number,
): Promise<number | null> {
  if (!SERPAPI_KEY || !fromIata || !toIata || !outDate || !returnDate) return null;

  const params = new URLSearchParams({
    engine:         "google_flights",
    departure_id:   fromIata,
    arrival_id:     toIata,
    outbound_date:  outDate,
    return_date:    returnDate,
    type:           "1",   // round-trip
    adults:         "1",
    currency:       "USD",
    hl:             "es",
    gl:             "us",
    api_key:        SERPAPI_KEY,
  });

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      best_flights?: { price?: number }[];
      other_flights?: { price?: number }[];
      error?: string;
    };
    if (data.error) return null;

    const allGroups = [...(data.best_flights ?? []), ...(data.other_flights ?? [])];
    const prices = allGroups.map(g => g.price ?? 0).filter(p => p > 0);
    if (!prices.length) return null;

    // Return cheapest RT price in CLP (per-person × adults)
    return Math.round(Math.min(...prices) * USD_TO_CLP * adults);
  } catch {
    return null;
  }
}

// ── All legs in parallel ──────────────────────────────────────────────────────
export interface FlightLeg {
  fromCity: string;
  toCity:   string;
  fromIata?: string;
  toIata?:   string;
  date?:     string;
}

export async function fetchFlightsForLegs(
  legs:   FlightLeg[],
  adults: number
): Promise<Record<string, FlightOption[]>> {
  const results = await Promise.all(
    legs.map(async leg => {
      const key = `${leg.fromCity}-${leg.toCity}`;
      if (!leg.fromIata || !leg.toIata || !leg.date) return [key, [] as FlightOption[]] as const;
      try {
        const opts = await fetchLegFlights(leg.fromIata, leg.toIata, leg.date, adults);
        return [key, opts] as const;
      } catch {
        return [key, [] as FlightOption[]] as const;
      }
    })
  );
  return Object.fromEntries(results);
}
