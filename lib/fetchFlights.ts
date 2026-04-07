import type { FlightOption } from "@/types/trip";
import { fetchScraperFlights, type ScraperFlight } from "./scraperClient";

const USD_TO_CLP = 950;

// Value of 1 hour of travel time by style (CLP)
// score = priceClp + (durationHours × HOUR_VALUE) → lowest score wins
export const HOUR_VALUE_CLP: Record<string, number> = {
  mochilero: 19_000,  // ~$20 USD/hr — time is cheap, they have flexibility
  comfort:   57_000,  // ~$60 USD/hr
  premium:   95_000,  // ~$100 USD/hr
};

export function flightScore(priceClp: number, durationMin: number, travelStyle: string): number {
  const hourValue = HOUR_VALUE_CLP[travelStyle] ?? HOUR_VALUE_CLP.comfort;
  return priceClp + (durationMin / 60) * hourValue;
}

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

// ── Map scraper results → FlightOption[] ─────────────────────────────────────
function buildFlightOptions(
  scraperFlights: ScraperFlight[],
  fromIata:       string,
  toIata:         string,
  date:           string,
  totalPax:       number,  // adults + children, for booking URL
  allPricesClp:   number[]
): FlightOption[] {
  const minP = Math.min(...allPricesClp);
  const maxP = Math.max(...allPricesClp);

  return scraperFlights.map(f => {
    const airline     = f.airline;
    const code        = carrierCodeFromAirline(airline);
    const departure   = f.departure_time;
    const arrival     = f.arrival_time;
    const durationMin = f.duration_minutes;
    const stops       = f.stops;
    // price_usd is already the group total from Google (calculated server-side with passenger breakdown)
    const priceClp    = Math.round(f.price_usd * USD_TO_CLP);

    const pros: string[] = [];
    const cons: string[] = [];

    if (stops === 0) pros.push("Vuelo directo, sin escalas");
    else             cons.push(`${stops} escala${stops > 1 ? "s" : ""}`);

    if (allPricesClp.length > 1) {
      const range = maxP - minP;
      if (priceClp <= minP + range * 0.2)      pros.push("El más económico");
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

    if (!pros.length) pros.push("Aerolínea con trayectoria en la ruta");
    if (!cons.length) cons.push("Verifica si incluye equipaje de bodega");

    return {
      airline,
      flightNumber: f.flight_number,
      departure,
      arrival,
      durationMin,
      stops,
      priceClp,
      pros,
      cons,
      bookingSearchUrl: airlineUrl(code, fromIata, toIata, date, totalPax),
    } satisfies FlightOption;
  });
}

// ── Single leg via scraper ────────────────────────────────────────────────────
// price_usd from the scraper is already the group total (Google calculates
// infant/child discounts server-side). price_usd_per_adult is for display only.

export async function fetchLegFlights(
  fromIata:    string,
  toIata:      string,
  date:        string,
  adults:      number,
  travelStyle: string = "comfort",
  children:    number = 0,
  infants:     number = 0,
): Promise<FlightOption[]> {
  if (!fromIata || !toIata || !date) return [];

  const totalPax = Math.max(1, adults + children);
  const scraperResults = await fetchScraperFlights(fromIata, toIata, date, adults, "economy", children, 0, infants);
  if (!scraperResults.length) return [];

  // price_usd is the group total returned by Google for the given passenger breakdown
  const allPricesClp = scraperResults
    .map(f => Math.round(f.price_usd * USD_TO_CLP))
    .filter(p => p > 0);
  if (!allPricesClp.length) return [];

  const options = buildFlightOptions(scraperResults.slice(0, 6), fromIata, toIata, date, totalPax, allPricesClp)
    .filter(o => o.priceClp > 0);
  if (!options.length) return [];

  options.sort((a, b) => flightScore(a.priceClp, a.durationMin, travelStyle) - flightScore(b.priceClp, b.durationMin, travelStyle));

  if (options[0]) {
    const winner = options[0];
    const scoreUsd = Math.round(flightScore(winner.priceClp, winner.durationMin, travelStyle) / USD_TO_CLP);
    // Use price_usd_per_adult for the per-person display
    const scraperWinner = scraperResults.find(f => Math.round(f.price_usd * USD_TO_CLP) === winner.priceClp);
    const perAdultUsd = scraperWinner?.price_usd_per_adult ?? Math.round(winner.priceClp / USD_TO_CLP / Math.max(adults, 1));
    const durationH = Math.round(winner.durationMin / 60 * 10) / 10;
    const label = `⭐ Mejor valor — $${perAdultUsd} USD/adulto · ${durationH}h · score ${scoreUsd} USD`;
    options[0].pros = [label, ...options[0].pros];
  }

  return options;
}

// ── Round-trip: cheapest outbound + return price in CLP ──────────────────────
export async function fetchRoundTripBestPrice(
  fromIata:   string,
  toIata:     string,
  outDate:    string,
  returnDate: string,
  adults:     number,
  children:   number = 0,
  infants:    number = 0,
): Promise<number | null> {
  if (!fromIata || !toIata || !outDate || !returnDate) return null;

  const [outbound, inbound] = await Promise.all([
    fetchScraperFlights(fromIata, toIata, outDate, adults, "economy", children, 0, infants),
    fetchScraperFlights(toIata, fromIata, returnDate, adults, "economy", children, 0, infants),
  ]);

  // price_usd is already the group total
  const outMin = Math.min(...outbound.map(f => f.price_usd).filter(p => p > 0));
  const inMin  = Math.min(...inbound.map(f => f.price_usd).filter(p => p > 0));

  if (!isFinite(outMin) || !isFinite(inMin)) return null;
  return Math.round((outMin + inMin) * USD_TO_CLP);
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
  legs:        FlightLeg[],
  adults:      number,
  travelStyle: string = "comfort",
  children:    number = 0,
  infants:     number = 0,
): Promise<Record<string, FlightOption[]>> {
  const results = await Promise.all(
    legs.map(async leg => {
      const key = `${leg.fromCity}-${leg.toCity}`;
      if (!leg.fromIata || !leg.toIata || !leg.date) return [key, [] as FlightOption[]] as const;
      try {
        const opts = await fetchLegFlights(leg.fromIata, leg.toIata, leg.date, adults, travelStyle, children, infants);
        return [key, opts] as const;
      } catch {
        return [key, [] as FlightOption[]] as const;
      }
    })
  );
  return Object.fromEntries(results);
}
