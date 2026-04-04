import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { PlanningInput, DayPlan, CostBreakdown, Traveler, HotelRecommendation } from "@/types/trip";
import { fetchHotelsForCities } from "@/lib/fetchHotels";
import { fetchFlightsForLegs } from "@/lib/fetchFlights";
import { analyzeFlightStrategy, type StrategyLeg } from "@/lib/flightStrategy";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const USD_TO_CLP = 950;

// Cities with multiple airports — maps route type to correct IATA
// "default" = main international; "regional" = secondary/domestic
const MULTI_AIRPORT: Record<string, { default: string; regional: string; regionalCities: string[] }> = {
  "buenos aires": {
    default:  "EZE",  // Ezeiza — long-haul international
    regional: "AEP",  // Aeroparque — regional (Uruguay, Chile, Brazil, Paraguay, Bolivia)
    regionalCities: ["montevideo", "santiago", "lima", "são paulo", "sao paulo", "rio de janeiro", "asuncion", "asunción", "santa cruz", "la paz", "bogota", "bogotá"],
  },
  "london": {
    default:  "LHR",
    regional: "LGW",
    regionalCities: [],
  },
  "new york": {
    default:  "JFK",
    regional: "LGA",
    regionalCities: [],
  },
  "milan":  { default: "MXP", regional: "LIN", regionalCities: [] },
  "paris":  { default: "CDG", regional: "ORY", regionalCities: [] },
  "chicago":{ default: "ORD", regional: "MDW", regionalCities: [] },
  "tokyo":  { default: "NRT", regional: "HND", regionalCities: [] },
  "osaka":  { default: "KIX", regional: "ITM", regionalCities: [] },
};

/**
 * Given a city name and the other city it's connecting TO/FROM,
 * return the correct IATA code for that route.
 */
function resolveIata(city: string, otherCity: string, suggestedIata?: string): string | undefined {
  const key = city.toLowerCase().trim();
  const info = MULTI_AIRPORT[key];
  if (!info) return suggestedIata; // single-airport city, trust haiku

  const other = otherCity.toLowerCase().trim();
  const useRegional = info.regionalCities.some(r => other.includes(r) || r.includes(other));
  return useRegional ? info.regional : info.default;
}

const STYLE_BUDGETS = {
  mochilero:  { hotel: 20000, food: 15000, activities: 8000,  local: 3000 },
  comfort:    { hotel: 60000, food: 35000, activities: 20000, local: 6000 },
  premium:    { hotel: 150000, food: 80000, activities: 50000, local: 12000 },
};

const TRAVELER_EMOJIS = ["🧑","👩","🧔","👱","🧕","👨‍🦱","👩‍🦰","🧒"];
const TRAVELER_COLORS = ["#1565C0","#FF7043","#2E7D32","#7B1FA2","#F9A825","#546E7A","#E64A19","#0D47A1"];

function buildFlightUrl(from: string, to: string, fromIata?: string, toIata?: string, date?: string, pax?: number): string {
  const d = (date ?? "").slice(0, 10);
  if (fromIata && toIata && d)
    return `https://www.google.com/travel/flights#flt=${fromIata}.${toIata}.${d};c:CLP;e:${pax ?? 1};sd:1;t:f`;
  return `https://www.google.com/travel/flights/search?q=${encodeURIComponent(`vuelos ${from} ${to}`)}&hl=es`;
}

function safeParseJson(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  let s = "", inStr = false, esc = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i], code = cleaned.charCodeAt(i);
    if (esc) { s += ch; esc = false; continue; }
    if (ch === "\\" && inStr) { s += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; s += ch; continue; }
    if (inStr && code < 0x20) {
      if (code === 10) s += "\\n";
      else if (code === 13) s += "\\r";
      else if (code === 9) s += "\\t";
      continue;
    }
    s += ch;
  }
  return JSON.parse(s);
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const lap = (label: string) => console.log(`[itinerary] ⏱ ${label}: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  try {
    const input: PlanningInput = await req.json();
    const { adults, travelStyle, originCity, destinationCities, startDate, endDate } = input;
    const roundTrip = input.roundTrip !== false; // default true
    const firstTimeCities = input.firstTimeCities ?? {};

    const totalDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000);
    const allCities = destinationCities;
    const inputDaysPerCity = input.daysPerCity ?? [];
    const daysPerCity = (i: number) =>
      inputDaysPerCity[i] ?? Math.floor((totalDays - allCities.length) / Math.max(allCities.length, 1));
    const budget = STYLE_BUDGETS[travelStyle];
    const client = new Anthropic();

    // ── Llamada 1: estructura (rápida, haiku) ────────────────────
    console.log("[itinerary] step1: calling structure haiku", { allCities, totalDays, travelStyle });
    const structureMsg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `Genera la estructura de este viaje. SOLO JSON válido. Estamos en 2026.

Origen: ${originCity} → ${allCities.join(" → ")}
Fechas: ${startDate} → ${endDate} (${totalDays} días)
Viajeros: ${adults} | Estilo: ${travelStyle}
Días por ciudad: ${allCities.map((c, i) => `${c}=${daysPerCity(i)}d`).join(", ")}

Formato exacto:
{
  "title": "...",
  "transportLegs": [
    {"fromCity":"CIUDAD_ORIGEN","toCity":"CIUDAD_DESTINO","fromIata":"IATA_CORRECTO","toIata":"IATA_CORRECTO","date":"FECHA_ISO"}
  ],
  "accommodations": [
    {"city":"...","name":"...","stars":4,"rating":8.4,"pricePerNight":65000,"nights":N,"totalCost":N,"neighborhood":"..."}
  ],
  "cityArrivalDates": {"ciudad":"fecha_iso"},
  "savingsTip": "..."
}

CRÍTICO — Aeropuertos con múltiples terminales, usa el correcto según la ruta:
- Buenos Aires: AEP (Aeroparque) para vuelos REGIONALES a Uruguay, Chile, Brasil, Paraguay, Bolivia. EZE (Ezeiza) solo para intercontinental (Europa, EEUU, México).
- Santiago: SCL (único aeropuerto internacional)
- Montevideo: MVD (Carrasco, único)
- Lima: LIM (único)
- São Paulo: GRU (Guarulhos) internacional, CGH (Congonhas) doméstico
- Bogotá: BOG (único)
- Ciudad de México: MEX (único)

Reglas adicionales: precios en CLP para estilo ${travelStyle}, 1 hotel por ciudad destino, IATA codes reales y correctos según tipo de ruta.`
      }],
    });

    const structureRaw = (structureMsg.content[0] as { type: string; text: string }).text;
    lap("estructura haiku");
    console.log("[itinerary] step2: structure raw length", structureRaw.length, "preview:", structureRaw.slice(0, 200));
    const structure = safeParseJson(structureRaw) as Record<string, unknown>;
    console.log("[itinerary] step3: structure parsed ok, keys:", Object.keys(structure));
    const arrivalDates = (structure.cityArrivalDates ?? {}) as Record<string, string>;

    // ── Helper: date arithmetic ──────────────────────────────────
    function addDaysStr(dateStr: string, n: number): string {
      const d = new Date(dateStr + "T12:00:00");
      d.setDate(d.getDate() + n);
      return d.toISOString().split("T")[0];
    }

    // ── Helper: build prompt for one batch of days ───────────────
    function batchPrompt(
      city: string, prevCity: string, batchDays: number,
      batchStartDate: string, batchOffset: number,
      isFirstTime: boolean,
      isDepartureBatch: boolean = false  // last batch of last city — final day is departure
    ): string {
      const isFirstBatch = batchOffset === 0;
      const firstTimeLine = isFirstTime
        ? `PRIMERA VISITA → incluir sitios icónicos imperdibles`
        : `VIAJERO QUE CONOCE ${city} → mercados locales, bares de barrio, sin sitios turísticos obvios`;

      const day1Block = isFirstBatch ? `
Día 1 = día de viaje. Calcula horario PRECISO para ${prevCity}→${city}:
- Traslado al aeropuerto de ${prevCity} (emoji 🚕, coste CLP real)
- Vuelo ${prevCity}→${city} (emoji ✈️, durationMin = minutos reales del vuelo)
- Llegada + inmigración/aduana si es internacional (emoji 🛬)
- Traslado aeropuerto→hotel con opciones concretas y coste CLP (emoji 🚌)
- Check-in (emoji 🏨)
- Actividades de tarde solo si llegan antes de las 16:00
isTravelDay=true, theme="Llegada a ${city}"` : `
Todos los días de este bloque son días COMPLETOS en ${city} (no es día de viaje).
isTravelDay=false, morning: 2 actividades, afternoon: 2 actividades`;

      // Determine if return is international (different continent → 3hrs; same region → 2hrs)
      const returnIsIntl = (() => {
        const LATAM = ["santiago","lima","bogota","bogotá","buenos aires","montevideo","sao paulo","são paulo","rio de janeiro","cusco","quito","asuncion","asunción","la paz","medellin","medellín","cartagena","ciudad de mexico","panama city"];
        const originNorm = originCity.toLowerCase().trim();
        const cityNorm   = city.toLowerCase().trim();
        const bothLatam  = LATAM.includes(originNorm) && LATAM.includes(cityNorm);
        return !bothLatam;
      })();
      const airportLeadHrs = returnIsIntl ? 3 : 2;

      const departureDayBlock = isDepartureBatch ? `

CRÍTICO — EL ÚLTIMO DÍA (día ${batchOffset + batchDays}) ES EL DÍA DE REGRESO A ${originCity}:
- Es un día PARCIAL: actividades de mañana SOLO si hay tiempo antes de ir al aeropuerto
- Check-out del hotel a las 12:00 (emoji 🏨)
- Traslado hotel→aeropuerto de ${city} (emoji 🚕, coste CLP real, opciones concretas de transporte)
- Llegar al aeropuerto ${airportLeadHrs} horas antes del vuelo (vuelo ${returnIsIntl ? "internacional" : "doméstico"})
- Facturación y control de seguridad (emoji ✈️)
- Vuelo de regreso a ${originCity}
- Si el vuelo es por la tarde (después de las 14:00): incluir desayuno + 1 actividad de mañana cerca del hotel
- Si el vuelo es por la mañana (antes de las 12:00): solo desayuno rápido + traslado
isTravelDay=true, theme="Regreso a ${originCity}"` : "";

      return `Genera exactamente ${batchDays} días del itinerario en ${city}. Año 2026 — usa precios, lugares y referencias actuales.
Estilo: ${travelStyle} | ${adults} viajeros | ${firstTimeLine}
Origen vuelo: ${prevCity}→${city} | Fecha primer día del bloque: ${batchStartDate}
SOLO JSON válido sin markdown.
${day1Block}${departureDayBlock}

Formato de cada día:
{"dayNumber":N,"city":"${city}","date":"YYYY-MM-DD","theme":"...","isTravelDay":BOOL,
"morning":[{"time":"HH:MM","durationMin":N,"name":"Nombre real y específico","category":"CATEGORIA","costClp":N,"tip":"Tip ultra-concreto con dirección, precio exacto o link","emoji":"🏛️"}],
"lunch":{"options":[{"name":"Restaurant real con dirección o barrio","cuisine":"...","priceTier":"$$","costClp":N}],"recommended":"..."},
"afternoon":[...misma estructura que morning...],
"dinner":{"options":[{"name":"Restaurant real con dirección o barrio","cuisine":"...","priceTier":"$$","costClp":N}],"recommended":"..."},
"localTransportCostClp":N,"dayTotalClp":N}

CATEGORÍAS VÁLIDAS (usa EXACTAMENTE estos valores en "category"):
- "culture"       → museos, sitios históricos, monumentos, arte, arquitectura
- "nature"        → parques, playas, montañas, senderismo, miradores, jardines
- "adventure"     → deportes extremos, rafting, tours activos, escalada, surf
- "food"          → tours gastronómicos, mercados de comida, degustaciones, clases de cocina
- "nightlife"     → bares, clubs, espectáculos nocturnos, tanguerías, flamenco
- "shopping"      → mercados artesanales, tiendas locales, ferias, outlets
- "wellness"      → spas, yoga, termas, masajes, relax
- "entertainment" → conciertos, eventos deportivos, shows, parques temáticos
- "transport"     → traslados al aeropuerto, vuelos, buses interurbanos, taxis (SOLO para días de viaje)

REGLAS ESTRICTAS:
- Exactamente ${batchDays} días, dayNumber empieza en ${batchOffset + 1}, fechas desde ${batchStartDate}
- Nombres REALES y ESPECÍFICOS — nunca genéricos ("Restaurante local" o "Museo de la ciudad" no son válidos)
- Tips con datos concretos: línea de metro, precio de entrada, horario real, cómo reservar
- dayTotalClp = suma exacta de todos los costClp del día
- SOLO el array dentro de {"days":[...]}

COSTOS — TODOS los valores son POR PERSONA (el sistema multiplica por ${adults} después):
- costClp en actividades = precio de entrada POR 1 PERSONA
- costClp en comidas = precio POR 1 PERSONA
- localTransportCostClp = costo de transporte POR 1 PERSONA ese día
- Convierte USD→CLP multiplicando por ${USD_TO_CLP}. Ej: entrada $33 USD → ${33 * USD_TO_CLP} CLP por persona
- Actividades GRATIS (parques, plazas, catedrales, miradores públicos): costClp = 0
- NO infles costos — si no sabes el precio exacto, estima conservadoramente

TRANSPORTE LOCAL (localTransportCostClp) — POR PERSONA:
- Usa el precio REAL por trayecto en ${city} en 2026, suma solo los viajes del día
- Ej: metro ${city} cuesta X CLP/trayecto → 3 trayectos = 3X por persona
- NO cobres tarjetas recargables, pases diarios ni abonos
- Días de viaje (isTravelDay=true): solo traslado aeropuerto↔hotel por persona`;
    }

    // ── Hoteles + vuelos en paralelo con días ────────────────────
    const hotelsPromise = fetchHotelsForCities(allCities, travelStyle, startDate, endDate, adults)
      .then(recs => { lap("hoteles"); console.log("[itinerary] hotels ok:", Object.keys(recs)); return recs; })
      .catch(e => { console.error("[itinerary] hotels error:", e instanceof Error ? e.message : e); return {} as Record<string, HotelRecommendation[]>; });

    // Build legs list for flights — we know cities/IATAs from structure
    // Flights promise starts now and resolves after city days are done
    const legsForFlights = allCities.map((city, i) => {
      const leg = (structure.transportLegs as Array<{fromCity:string;toCity:string;fromIata?:string;toIata?:string;date?:string}>)
        .find(l => l.toCity?.toLowerCase() === city.toLowerCase());
      const fromCity = i === 0 ? originCity : allCities[i - 1];
      // Resolve correct IATA for multi-airport cities based on the actual route
      const fromIata = resolveIata(fromCity, city, leg?.fromIata);
      const toIata   = resolveIata(city, fromCity, leg?.toIata);
      return { fromCity, toCity: city, fromIata, toIata, date: leg?.date ?? startDate };
    });
    if (roundTrip) {
      const lastCity = allCities[allCities.length - 1];
      const firstLeg = (structure.transportLegs as Array<{fromCity:string;toCity:string;fromIata?:string;toIata?:string}>)
        .find(l => l.fromCity?.toLowerCase() === originCity.toLowerCase());
      const lastLeg = (structure.transportLegs as Array<{fromCity:string;toCity:string;fromIata?:string;toIata?:string}>)
        .find(l => l.toCity?.toLowerCase() === lastCity.toLowerCase());
      // Return leg: lastCity → originCity, resolve IATAs for the return direction
      const returnFromIata = resolveIata(lastCity, originCity, lastLeg?.toIata);
      const returnToIata   = resolveIata(originCity, lastCity, firstLeg?.fromIata);
      legsForFlights.push({ fromCity: lastCity, toCity: originCity, fromIata: returnFromIata, toIata: returnToIata, date: endDate });
    }
    const strategyLegs: StrategyLeg[] = legsForFlights
      .filter(l => l.fromIata && l.toIata && l.date)
      .map(l => ({ fromCity: l.fromCity, toCity: l.toCity, fromIata: l.fromIata!, toIata: l.toIata!, date: l.date! }));

    const strategyPromise = analyzeFlightStrategy(strategyLegs, adults, originCity, roundTrip, travelStyle)
      .then(r => { lap("vuelos + estrategia"); console.log("[itinerary] strategy:", r.recommendation.type); return r; })
      .catch(e => {
        console.error("[itinerary] strategy error:", e instanceof Error ? e.message : e);
        return null;
      });

    // Also keep per-leg fallback for any legs not covered by strategy engine
    const flightsPromise = strategyPromise.then(s => s?.flightOptions ?? {})
      .catch(() => fetchFlightsForLegs(legsForFlights, adults, travelStyle));

    // ── Llamadas 2-N: ciudades en PARALELO, batches de 8 días (Haiku) ──
    const BATCH_SIZE = 8;
    console.log("[itinerary] step4: parallel cities with batching", allCities);

    const cityDayResults = await Promise.all(allCities.map(async (city, idx) => {
      const cityDays = daysPerCity(idx);
      const arrival = arrivalDates[city] ?? startDate;
      const isFirstTime = firstTimeCities[city] !== false;
      const prevCity = idx === 0 ? originCity : allCities[idx - 1];

      const totalBatches = Math.ceil(cityDays / BATCH_SIZE);
      const cityAllDays: DayPlan[] = [];

      const isLastCity = idx === allCities.length - 1;

      for (let b = 0; b < totalBatches; b++) {
        const batchOffset = b * BATCH_SIZE;
        const batchCount = Math.min(BATCH_SIZE, cityDays - batchOffset);
        const batchStartDate = addDaysStr(arrival, batchOffset);
        // Last batch of the last city contains the departure day (return to origin)
        const isDepartureBatch = isLastCity && b === totalBatches - 1 && roundTrip;

        console.log(`[itinerary] ${city} batch ${b + 1}/${totalBatches}: days ${batchOffset + 1}-${batchOffset + batchCount} from ${batchStartDate}${isDepartureBatch ? " [DEPARTURE]" : ""}`);

        const msg = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 8192,
          messages: [{ role: "user", content: batchPrompt(city, prevCity, batchCount, batchStartDate, batchOffset, isFirstTime, isDepartureBatch) }],
        });

        const raw = (msg.content[0] as { type: string; text: string }).text;
        console.log(`[itinerary] ${city} batch ${b + 1} raw length:`, raw.length);

        try {
          const parsed = safeParseJson(raw) as { days: DayPlan[] };
          cityAllDays.push(...(parsed.days ?? []));
        } catch (e) {
          console.error(`[itinerary] ${city} batch ${b + 1} parse error:`, e instanceof Error ? e.message : e, raw.slice(0, 200));
        }
      }

      console.log(`[itinerary] ${city} total days collected: ${cityAllDays.length}`);
      return cityAllDays;
    }));

    lap("ciudades (todos los días generados)");
    // ── Esperar hoteles y vuelos (corrieron en paralelo con los días) ──
    const [hotelRecommendations, flightOptions, strategyResult] = await Promise.all([
      hotelsPromise,
      flightsPromise,
      strategyPromise,
    ]);

    // ── Flight reasons + Optimizer tips en PARALELO ──────────────────────────
    const flightReasonsPromise = (async () => {
      const flightItems = Object.entries(flightOptions).flatMap(([leg, opts]) => {
        const f = opts[0];
        if (!f) return [];
        return [{ leg, airline: f.airline, stops: f.stops, departure: f.departure, arrival: f.arrival, durationMin: f.durationMin, priceUsd: Math.round(f.priceClp / USD_TO_CLP) }];
      });
      if (!flightItems.length) return;
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{
          role: "user",
          content: `Viaje estilo "${travelStyle}", ${adults} adulto(s). Explica en 1-2 oraciones por qué cada vuelo es el mejor para este viajero. En español, sé específico con precio, duración y aerolínea.

Vuelos:
${JSON.stringify(flightItems, null, 2)}

SOLO JSON: { "reasons": { "<leg>": "razón" } }`,
        }],
      });
      const parsed = safeParseJson((msg.content[0] as { type: string; text: string }).text) as { reasons?: Record<string, string> };
      for (const [leg, opts] of Object.entries(flightOptions)) {
        if (opts[0] && parsed.reasons?.[leg]) opts[0] = { ...opts[0], selectionReason: parsed.reasons[leg] };
      }
    })().catch(e => console.error("[itinerary] flight reasons error:", e instanceof Error ? e.message : e));

    // ── Ensamblar ────────────────────────────────────────────────
    const allDays: DayPlan[] = [];
    let counter = 1;
    for (const days of cityDayResults) {
      for (const day of days) allDays.push({ ...day, dayNumber: counter++ });
    }
    console.log(`[itinerary] allDays assembled: ${allDays.length} days | per city: ${cityDayResults.map((d, i) => `${allCities[i]}=${d.length}`).join(", ")}`);

    const accs = (structure.accommodations ?? []) as Array<{ totalCost: number; city: string; name: string; stars: number; rating: number; pricePerNight: number; nights: number; neighborhood: string }>;
    const legs = (structure.transportLegs ?? []) as Array<{ fromCity: string; toCity: string; fromIata?: string; toIata?: string; date?: string }>;

    // Use real hotel prices from SerpAPI when available
    const realHotelTotal = Object.entries(hotelRecommendations).reduce((sum, [city, recs]) => {
      const h = recs[0];
      if (!h) return sum;
      const cityDaysCount = daysPerCity(allCities.indexOf(city));
      return sum + h.pricePerNightClp * cityDaysCount;
    }, 0);
    // Fallback to structure estimates if SerpAPI returned nothing
    const hotelTotal = realHotelTotal > 0 ? realHotelTotal : accs.reduce((s, a) => s + (a.totalCost ?? 0), 0);

    // Use real flight prices from SerpAPI when available
    const realFlightTotal = Object.values(flightOptions).reduce((sum, opts) => {
      const f = opts[0];
      return f ? sum + f.priceClp : sum;
    }, 0);
    const transportTotal = realFlightTotal > 0 ? realFlightTotal : 0; // 0 = no real price found, don't show a fake number

    const foodTotal = allDays.reduce((s, d) => d.isTravelDay ? s :
      s + (d.lunch?.options?.[0]?.costClp ?? budget.food/2) + (d.dinner?.options?.[0]?.costClp ?? budget.food/2), 0) * adults;
    const activitiesTotal = allDays.reduce((s, d) =>
      s + [...(d.morning??[]),...(d.afternoon??[])]
        .filter((a: {category?: string}) => a.category !== "transport" && a.category !== "food")
        .reduce((ss: number, a: {costClp?:number}) => ss+(a.costClp??0), 0), 0) * adults;
    const localTotal = allDays.reduce((s, d) => s + (d.localTransportCostClp ?? 0), 0) * adults;
    const extras = Math.round((hotelTotal + foodTotal + activitiesTotal) * 0.06);
    const total = transportTotal + hotelTotal + foodTotal + activitiesTotal + localTotal + extras;

    const costs: CostBreakdown = {
      transport: transportTotal, accommodation: hotelTotal, food: foodTotal,
      activities: activitiesTotal, localTransport: localTotal, extras, total,
      perPerson: Math.round(total / adults),
      perDayPerPerson: Math.round(total / adults / Math.max(totalDays, 1)),
      byCityClp: Object.fromEntries(allCities.map(c => [c, Math.round(total / allCities.length)])),
    };

    // ── Optimizer tips + flight reasons en paralelo ──────────────────────────
    let optimizerTips: string[] = [];
    const optimizerTipsPromise = (async () => {
    try {
      // Transport alternatives: known cheaper options for specific routes
      // altCostUsd = cost of the alternative; description used to build the tip with real savings
      const TRANSPORT_ALTERNATIVES: Array<{ from: string; to: string; altCostUsd: number; description: string }> = [
        { from: "buenos aires", to: "montevideo", altCostUsd: 50,  description: "Ferry Buquebus Buenos Aires→Montevideo (~$50 USD, 2h30m) — llegas al centro directamente sin pasar por aeropuertos" },
        { from: "montevideo",   to: "buenos aires", altCostUsd: 50,  description: "Ferry Buquebus Montevideo→Buenos Aires (~$50 USD, 2h30m) — más conveniente que volar entre estos dos destinos" },
        { from: "santiago",     to: "buenos aires", altCostUsd: 40,  description: "Bus nocturno Santiago→Buenos Aires (Turbus/Andesmar, ~$30-50 USD) — atraviesas la cordillera y ahorras además una noche de hotel" },
        { from: "buenos aires", to: "santiago",     altCostUsd: 40,  description: "Bus nocturno Buenos Aires→Santiago (~$30-50 USD) — ahorras el vuelo y además una noche de alojamiento" },
        { from: "barcelona",    to: "madrid",        altCostUsd: 50,  description: "Tren AVE Barcelona→Madrid (~€35-60, 2h30m) — más rápido puerta a puerta que volar considerando aeropuertos" },
        { from: "madrid",       to: "barcelona",     altCostUsd: 50,  description: "Tren AVE Madrid→Barcelona (~€35-60, 2h30m) — más rápido puerta a puerta que volar" },
        { from: "paris",        to: "london",        altCostUsd: 80,  description: "Eurostar París→Londres (~€60-100, 2h15m) — llega a St. Pancras en el centro, evita Heathrow completamente" },
        { from: "london",       to: "paris",         altCostUsd: 80,  description: "Eurostar Londres→París (~€60-100, 2h15m) — más conveniente que volar entre estas ciudades" },
        { from: "amsterdam",    to: "paris",         altCostUsd: 60,  description: "Tren Thalys Ámsterdam→París (~€40-80, 3h30m) — directamente entre centros de ciudad" },
        { from: "rome",         to: "florence",      altCostUsd: 30,  description: "Tren Frecciarossa Roma→Florencia (~€20-40, 1h30m) — más rápido que volar y llegas al centro" },
        { from: "roma",         to: "florencia",     altCostUsd: 30,  description: "Tren Frecciarossa Roma→Florencia (~€20-40, 1h30m) — más rápido que volar y llegas al centro" },
        { from: "santiago",     to: "mendoza",       altCostUsd: 18,  description: "Bus Santiago→Mendoza (~$15-20 USD, 7h) — cruza los Andes por mucho menos que un vuelo" },
      ];

      const transportTips = TRANSPORT_ALTERNATIVES
        .flatMap(alt => {
          const matchedLeg = legsForFlights.find(l =>
            l.fromCity?.toLowerCase().includes(alt.from) &&
            l.toCity?.toLowerCase().includes(alt.to)
          );
          if (!matchedLeg) return [];
          // Find the real flight price for this leg
          const legKey = `${matchedLeg.fromCity}-${matchedLeg.toCity}`;
          const flightPriceClp = flightOptions[legKey]?.[0]?.priceClp ?? 0;
          const flightPriceUsd = flightPriceClp > 0 ? Math.round(flightPriceClp / USD_TO_CLP / adults) : 0;
          const savingsUsd = flightPriceUsd > 0 ? flightPriceUsd - alt.altCostUsd : 0;
          if (savingsUsd > 0) {
            return [`💡 ${alt.description}. Ahorrarías ~$${savingsUsd} USD/persona vs el vuelo actual ($${flightPriceUsd} USD).`];
          }
          // Only show if alternative is actually cheaper (or price unknown)
          return flightPriceUsd === 0 ? [`💡 ${alt.description}.`] : [];
        });

      // Data-driven tips from real trip data
      const hotelAvgUsd = hotelTotal > 0 ? Math.round(hotelTotal / USD_TO_CLP / totalDays) : 0;
      const flightAvgUsd = transportTotal > 0 ? Math.round(transportTotal / USD_TO_CLP / adults / Math.max(legsForFlights.length, 1)) : 0;
      const accommodationPct = total > 0 ? Math.round(hotelTotal / total * 100) : 0;
      const transportPct = total > 0 ? Math.round(transportTotal / total * 100) : 0;

      const dataTips: string[] = [];
      if (accommodationPct > 45) dataTips.push(`El alojamiento representa el ${accommodationPct}% de tu presupuesto ($${hotelAvgUsd} USD/noche promedio). Si bajas una categoría en la ciudad más cara, puedes liberar fondos para experiencias.`);
      if (transportPct > 40) dataTips.push(`Los vuelos son el ${transportPct}% de tu presupuesto ($${flightAvgUsd} USD/vuelo promedio). Reservar con 6-8 semanas de anticipación típicamente baja los precios un 20-30%.`);
      if (adults >= 3) dataTips.push(`Viajando ${adults} personas, considera apartamentos en Airbnb — suelen salir más baratos que ${adults} habitaciones de hotel y ofrecen cocina para ahorrar en comidas.`);
      if (totalDays >= 14) dataTips.push(`Para ${totalDays} días, los pases de transporte semanal (metro, buses) suelen ser hasta un 40% más baratos que pagar por viaje.`);

      // LLM-generated tips with real numbers
      const tipsMsg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Genera tips de optimización REALES y ACCIONABLES para este viaje en 2026. Cada tip debe sustentarse en los datos reales del viaje — no inventes alternativas de precio ni compares con datos que no tienes.

Datos del viaje:
- Ruta: ${originCity} → ${allCities.join(" → ")}
- Estilo: ${travelStyle} | ${adults} adulto(s) | ${totalDays} días
- Fechas: ${startDate} → ${endDate}
- Costo total: $${Math.round(total/USD_TO_CLP/adults).toLocaleString()} USD/persona
- Hoteles elegidos: ${Object.entries(hotelRecommendations).map(([c,r]) => r[0] ? `${c}: ${r[0].name} $${Math.round(r[0].pricePerNightClp/USD_TO_CLP)}/noche ${r[0].rating}/10` : "").filter(Boolean).join(", ")}
- Vuelos: ${Object.entries(flightOptions).map(([leg,opts]) => opts[0] ? `${leg}: ${opts[0].airline} $${Math.round(opts[0].priceClp/USD_TO_CLP/adults)} USD ${opts[0].stops === 0 ? "directo" : opts[0].stops+"escala"}` : "").filter(Boolean).join(", ")}

Genera SOLO tips con valor real — tips sobre: temporada y precios, costumbres locales de pago, apps útiles para este destino, cómo moverse dentro de cada ciudad, qué evitar, tarjetas de crédito sin comisión, etc.
NO generes tips sobre vuelos o hoteles alternativos (ya están elegidos los mejores).

SOLO JSON: { "tips": ["tip1", "tip2", ...] } — sin límite de cantidad, todos los que tengan valor real.`,
        }],
      });
      const parsedTips = safeParseJson((tipsMsg.content[0] as { type: string; text: string }).text) as { tips?: string[] };
      optimizerTips = [...transportTips, ...dataTips, ...(parsedTips.tips ?? [])];
    } catch (e) {
      console.error("[itinerary] optimizer tips error:", e instanceof Error ? e.message : e);
    }
    })();

    await Promise.all([flightReasonsPromise, optimizerTipsPromise]);
    lap("flight reasons + optimizer tips");

    const travelers_list: Traveler[] = Array.from({ length: adults }, (_, i) => ({
      id: `t-${i}`, name: i === 0 ? "Tú" : `Persona ${i + 1}`,
      emoji: TRAVELER_EMOJIS[i % TRAVELER_EMOJIS.length],
      color: TRAVELER_COLORS[i % TRAVELER_COLORS.length],
    }));

    const trip = {
      id: `trip-${Date.now()}`,
      title: (structure.title as string) ?? `${originCity} → ${allCities.join(" → ")}`,
      originCity,
      cities: allCities.map((name, i) => ({ name, country: "", days: daysPerCity(i), firstTime: true, interests: [] })),
      startDate, endDate, totalDays,
      travelers: { adults, children: input.children ?? 0 },
      travelStyle, budgetMaxClp: input.budgetMaxClp,
      transportLegs: (() => {
        const outbound = allCities.map((city, i) => {
          const leg = legs.find(l => l.toCity?.toLowerCase() === city.toLowerCase());
          const fromCity = i === 0 ? originCity : allCities[i - 1];
          const tDay = allDays.find(d => d.isTravelDay && d.city === city);
          const legDate = leg?.date ?? tDay?.date ?? startDate;
          const fromIata = resolveIata(fromCity, city, leg?.fromIata);
          const toIata   = resolveIata(city, fromCity, leg?.toIata);
          return {
            fromCity, toCity: city,
            fromIata, toIata, date: legDate,
            flightSearchUrl: buildFlightUrl(fromCity, city, fromIata, toIata, legDate, adults),
            selected: undefined, options: [],
          };
        });
        if (roundTrip) {
          const lastCity = allCities[allCities.length - 1];
          const firstLeg = legs.find(l => l.fromCity?.toLowerCase() === originCity.toLowerCase());
          const lastLeg  = legs.find(l => l.toCity?.toLowerCase() === lastCity.toLowerCase());
          const returnFromIata = resolveIata(lastCity, originCity, lastLeg?.toIata);
          const returnToIata   = resolveIata(originCity, lastCity, firstLeg?.fromIata);
          outbound.push({
            fromCity: lastCity, toCity: originCity,
            fromIata: returnFromIata, toIata: returnToIata, date: endDate,
            flightSearchUrl: buildFlightUrl(lastCity, originCity, returnFromIata, returnToIata, endDate, adults),
            selected: undefined, options: [],
          });
        }
        return outbound;
      })(),
      accommodations: accs,
      hotelRecommendations,
      flightOptions,
      flightStrategy: strategyResult?.recommendation ?? undefined,
      days: allDays, costs, travelers_list,
      splitAssignments: [], currency: "CLP",
      createdAt: new Date().toISOString(),
      savingsTip: structure.savingsTip,
      optimizerTips,
    };

    lap("TOTAL");
    return NextResponse.json({ trip });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[itinerary]", msg, stack);
    return NextResponse.json({ error: msg, stack }, { status: 500 });
  }
}
