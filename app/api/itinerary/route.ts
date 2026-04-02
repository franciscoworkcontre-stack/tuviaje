import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { PlanningInput, DayPlan, CostBreakdown, Traveler, HotelRecommendation } from "@/types/trip";
import { fetchHotelsForCities } from "@/lib/fetchHotels";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

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
        content: `Genera la estructura de este viaje. SOLO JSON válido.

Origen: ${originCity} → ${allCities.join(" → ")}
Fechas: ${startDate} → ${endDate} (${totalDays} días)
Viajeros: ${adults} | Estilo: ${travelStyle}
Días por ciudad: ${allCities.map((c, i) => `${c}=${daysPerCity(i)}d`).join(", ")}

{
  "title": "Santiago → Buenos Aires → Montevideo",
  "transportLegs": [
    {"fromCity":"${originCity}","toCity":"${allCities[0]}","fromIata":"SCL","toIata":"EZE","date":"${startDate}"}
  ],
  "accommodations": [
    {"city":"${allCities[0]}","name":"...","stars":4,"rating":8.4,"pricePerNight":65000,"nights":${daysPerCity(0)},"totalCost":${daysPerCity(0)*65000},"neighborhood":"..."}
  ],
  "cityArrivalDates": {"${allCities[0]}":"${startDate}"},
  "savingsTip": "...",
  "optimizerTips": ["...","..."]
}

Reglas: IATA codes reales, precios en CLP para ${travelStyle}, 1 hotel por ciudad destino.`
      }],
    });

    const structureRaw = (structureMsg.content[0] as { type: string; text: string }).text;
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
      batchStartDate: string, batchOffset: number, // 0 = first batch (has travel day)
      isFirstTime: boolean
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

      return `Genera exactamente ${batchDays} días del itinerario en ${city}.
Estilo: ${travelStyle} | ${adults} viajeros | ${firstTimeLine}
Origen vuelo: ${prevCity}→${city} | Fecha primer día del bloque: ${batchStartDate}
SOLO JSON válido sin markdown.
${day1Block}

Formato de cada día:
{"dayNumber":N,"city":"${city}","date":"YYYY-MM-DD","theme":"...","isTravelDay":BOOL,
"morning":[{"time":"HH:MM","durationMin":N,"name":"Nombre real","category":"culture","costClp":N,"tip":"Tip concreto","emoji":"🏛️"}],
"lunch":{"options":[{"name":"Restaurant real","cuisine":"...","priceTier":"$$","costClp":N}],"recommended":"..."},
"afternoon":[...misma estructura que morning...],
"dinner":{"options":[{"name":"Restaurant real","cuisine":"...","priceTier":"$$","costClp":N}],"recommended":"..."},
"localTransportCostClp":N,"dayTotalClp":N}

REGLAS ESTRICTAS:
- Exactamente ${batchDays} días, dayNumber empieza en ${batchOffset + 1}, fechas desde ${batchStartDate}
- Restaurantes y lugares REALES de ${city}
- Tips ultra-concretos ("Metro L2 estación X · $0.9 USD", "Reserva 48h antes en su web")
- Costos en CLP para estilo ${travelStyle}
- dayTotalClp = suma exacta de todos los costClp del día
- SOLO el array dentro de {"days":[...]}`;
    }

    // ── Llamada hoteles (paralela con días) ──────────────────────
    const hotelsPromise = fetchHotelsForCities(allCities, travelStyle, startDate, endDate, adults)
      .then(recs => { console.log("[itinerary] hotels: ok for cities:", Object.keys(recs)); return recs; })
      .catch(e => { console.error("[itinerary] hotels error:", e instanceof Error ? e.message : e); return {} as Record<string, HotelRecommendation[]>; });

    // ── Llamadas 2-N: ciudades en PARALELO, batches de 4 días ────
    const BATCH_SIZE = 4;
    console.log("[itinerary] step4: parallel cities with batching", allCities);

    const cityDayResults = await Promise.all(allCities.map(async (city, idx) => {
      const cityDays = daysPerCity(idx);
      const arrival = arrivalDates[city] ?? startDate;
      const isFirstTime = firstTimeCities[city] !== false;
      const prevCity = idx === 0 ? originCity : allCities[idx - 1];

      const totalBatches = Math.ceil(cityDays / BATCH_SIZE);
      const cityAllDays: DayPlan[] = [];

      // Batches run sequentially within a city (dates must be contiguous)
      for (let b = 0; b < totalBatches; b++) {
        const batchOffset = b * BATCH_SIZE;
        const batchCount = Math.min(BATCH_SIZE, cityDays - batchOffset);
        const batchStartDate = addDaysStr(arrival, batchOffset);

        console.log(`[itinerary] ${city} batch ${b + 1}/${totalBatches}: days ${batchOffset + 1}-${batchOffset + batchCount} from ${batchStartDate}`);

        const msg = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
          messages: [{ role: "user", content: batchPrompt(city, prevCity, batchCount, batchStartDate, batchOffset, isFirstTime) }],
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

    // ── Esperar hoteles (ya corrió en paralelo con los días) ─────
    const hotelRecommendations = await hotelsPromise;

    // ── Ensamblar ────────────────────────────────────────────────
    const allDays: DayPlan[] = [];
    let counter = 1;
    for (const days of cityDayResults) {
      for (const day of days) allDays.push({ ...day, dayNumber: counter++ });
    }

    const accs = (structure.accommodations ?? []) as Array<{ totalCost: number; city: string; name: string; stars: number; rating: number; pricePerNight: number; nights: number; neighborhood: string }>;
    const legs = (structure.transportLegs ?? []) as Array<{ fromCity: string; toCity: string; fromIata?: string; toIata?: string; date?: string }>;

    const hotelTotal = accs.reduce((s, a) => s + (a.totalCost ?? 0), 0);
    const foodTotal = allDays.reduce((s, d) => d.isTravelDay ? s :
      s + (d.lunch?.options?.[0]?.costClp ?? budget.food/2) + (d.dinner?.options?.[0]?.costClp ?? budget.food/2), 0) * adults;
    const activitiesTotal = allDays.reduce((s, d) =>
      s + [...(d.morning??[]),...(d.afternoon??[])].reduce((ss: number, a: {costClp?:number}) => ss+(a.costClp??0), 0), 0) * adults;
    const localTotal = allDays.reduce((s, d) => s + (d.localTransportCostClp ?? 0), 0) * adults;
    const transportEst = allCities.length * 45000 * adults;
    const extras = Math.round((hotelTotal + foodTotal + activitiesTotal) * 0.06);
    const total = transportEst + hotelTotal + foodTotal + activitiesTotal + localTotal + extras;

    const costs: CostBreakdown = {
      transport: transportEst, accommodation: hotelTotal, food: foodTotal,
      activities: activitiesTotal, localTransport: localTotal, extras, total,
      perPerson: Math.round(total / adults),
      perDayPerPerson: Math.round(total / adults / Math.max(totalDays, 1)),
      byCityClp: Object.fromEntries(allCities.map(c => [c, Math.round(total / allCities.length)])),
    };

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
          return {
            fromCity, toCity: city,
            fromIata: leg?.fromIata, toIata: leg?.toIata, date: legDate,
            flightSearchUrl: buildFlightUrl(fromCity, city, leg?.fromIata, leg?.toIata, legDate, adults),
            selected: undefined, options: [],
          };
        });
        // Return leg: only if roundTrip
        if (roundTrip) {
          const lastCity = allCities[allCities.length - 1];
          const firstLeg = legs.find(l => l.fromCity?.toLowerCase() === originCity.toLowerCase());
          const lastLeg = legs.find(l => l.toCity?.toLowerCase() === lastCity.toLowerCase());
          const returnFromIata = lastLeg?.toIata;
          const returnToIata = firstLeg?.fromIata;
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
      days: allDays, costs, travelers_list,
      splitAssignments: [], currency: "CLP",
      createdAt: new Date().toISOString(),
      savingsTip: structure.savingsTip,
      optimizerTips: (structure.optimizerTips as string[]) ?? [],
    };

    return NextResponse.json({ trip });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[itinerary]", msg, stack);
    return NextResponse.json({ error: msg, stack }, { status: 500 });
  }
}
