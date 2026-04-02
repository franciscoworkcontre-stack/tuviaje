import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { PlanningInput, DayPlan, CostBreakdown, Traveler, HotelRecommendation } from "@/types/trip";

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

    // ── Llamadas 2-N: actividades por ciudad EN PARALELO (sonnet) ─
    console.log("[itinerary] step4: starting parallel city calls", allCities);
    const cityDayResults = await Promise.all(allCities.map(async (city, idx) => {
      const cityDays = daysPerCity(idx);
      const arrival = arrivalDates[city] ?? startDate;
      const isFirstTime = firstTimeCities[city] !== false; // default true
      const prevCity = idx === 0 ? originCity : allCities[idx - 1];

      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        messages: [{
          role: "user",
          content: `Genera itinerario detallado para ${cityDays} días en ${city}.
Estilo: ${travelStyle} | Fecha llegada: ${arrival} | ${adults} viajeros
Origen del vuelo: ${prevCity} → ${city}
¿Primera vez en ${city}?: ${isFirstTime ? "SÍ — incluir imperdibles clásicos" : "NO — lugares locales menos conocidos, joyas ocultas"}
SOLO JSON válido, sin markdown.

ESTRUCTURA DÍA 1 — día de viaje con horario REAL y PRECISO:
Usa tu conocimiento para calcular:
- Hora salida típica desde ${prevCity} (vuelo mañana ~7-9am es lo más común)
- Duración real del vuelo ${prevCity}→${city} en minutos
- Hora llegada al aeropuerto de ${city}
- Si es vuelo internacional: +45-60 min inmigración + aduana
- Tiempo traslado aeropuerto→hotel en ${city} (taxi, shuttle o metro según lo que existe)
- Hora check-in hotel (~15:00 estándar, si llegan antes dejan maletas)
- Después del check-in: qué alcanza a hacerse

Ejemplo estructura día 1 CORRECTO (adaptar a ${prevCity}→${city}):
{
  "dayNumber": 1,
  "city": "${city}",
  "date": "${arrival}",
  "theme": "Llegada a ${city}",
  "isTravelDay": true,
  "morning": [
    {"time":"06:00","durationMin":90,"name":"Traslado al aeropuerto de ${prevCity}","category":"culture","costClp":15000,"tip":"Llega 2.5h antes si es vuelo internacional, 2h si es doméstico","emoji":"🚕"},
    {"time":"08:30","durationMin":185,"name":"Vuelo ${prevCity} → ${city}","category":"culture","costClp":0,"tip":"Vuelo de X horas. Zona horaria: indica si hay diferencia horaria","emoji":"✈️"},
    {"time":"12:15","durationMin":60,"name":"Llegada al aeropuerto — Inmigración y aduana","category":"culture","costClp":0,"tip":"Ten el pasaporte y declaración lista. Para ciudadanos CL → [ciudad] generalmente sin visa","emoji":"🛬"}
  ],
  "afternoon": [
    {"time":"13:30","durationMin":60,"name":"Traslado aeropuerto → hotel en [barrio]","category":"culture","costClp":18000,"tip":"[Opción concreta: ej. Shuttle EzeiBus $6 USD / Taxi oficial ~$30 USD / Metro línea X $1.2 USD]","emoji":"🚌"},
    {"time":"15:00","durationMin":30,"name":"Check-in en el hotel","category":"culture","costClp":0,"tip":"Si la habitación no está lista, deja el equipaje en consigna y sal a explorar","emoji":"🏨"},
    {"time":"15:30","durationMin":90,"name":"Primer paseo: [barrio específico de ${city}]","category":"culture","costClp":0,"tip":"[Tip concreto del barrio]","emoji":"🚶"},
    {"time":"17:00","durationMin":60,"name":"[Actividad liviana real en ${city}]","category":"culture","costClp":5000,"tip":"[Tip]","emoji":"☕"}
  ],
  "lunch": {"options":[{"name":"[Restaurant real en ruta aeropuerto→hotel]","cuisine":"...","priceTier":"$","costClp":8000}],"recommended":"Algo rápido y local cerca del aeropuerto o en el camino"},
  "dinner": {"options":[{"name":"[Restaurant real en barrio del hotel]","cuisine":"...","priceTier":"$$","costClp":18000}],"recommended":"Primera cena local cerca del hotel"},
  "localTransportCostClp": 18000,
  "dayTotalClp": 60000
}

Días normales (2+):
{
  "dayNumber": 2,
  "city": "${city}",
  "date": "YYYY-MM-DD",
  "theme": "Tema específico",
  "isTravelDay": false,
  "morning": [
    {"time":"09:00","durationMin":90,"name":"[Lugar real]","category":"culture","costClp":0,"tip":"[Tip concreto]","emoji":"🏛️"},
    {"time":"11:00","durationMin":60,"name":"[Lugar real]","category":"culture","costClp":5000,"tip":"[Tip]","emoji":"🎨"}
  ],
  "lunch": {"options":[{"name":"[Restaurant real]","cuisine":"...","priceTier":"$$","costClp":14000}],"recommended":"..."},
  "afternoon": [
    {"time":"15:00","durationMin":120,"name":"[Lugar real]","category":"culture","costClp":8000,"tip":"[Tip]","emoji":"🎭"},
    {"time":"17:30","durationMin":60,"name":"[Lugar real]","category":"food","costClp":0,"tip":"[Tip]","emoji":"🍷"}
  ],
  "dinner": {"options":[{"name":"[Restaurant real]","cuisine":"...","priceTier":"$$$","costClp":22000}],"recommended":"..."},
  "localTransportCostClp": 4000,
  "dayTotalClp": 85000
}

REGLAS:
- Exactamente ${cityDays} días, fechas consecutivas desde ${arrival}
- Día 1: isTravelDay=true, horarios REALES y PRECISOS del vuelo ${prevCity}→${city}
  * Calcula las horas exactas basado en vuelos típicos en esa ruta
  * Incluye SIEMPRE: traslado al aeropuerto, vuelo, llegada+aduana, traslado al hotel, check-in
  * Indica el costo REAL del traslado aeropuerto→hotel en CLP
  * Agrega actividades de tarde SOLO si el tiempo lo permite (llegar antes de las 16:00)
- Días normales: 2 actividades morning, 2 afternoon
- ${isFirstTime ? "PRIMERA VISITA: incluir los sitios icónicos imperdibles de " + city : "VIAJERO QUE YA CONOCE " + city + ": EVITAR sitios turísticos típicos, priorizar: mercados locales, bares de barrio, rutas menos conocidas, experiencias auténticas"}
- Restaurantes y lugares REALES y específicos de ${city} (nombres reales que existan hoy)
- Tips hiper-concretos y útiles ("Metro línea D, estación Facultad de Medicina, $200 ARS", "Reserva online con al menos 3 días de anticipación")
- Costos en CLP realistas para estilo ${travelStyle}
- 1 opción en lunch y dinner
- dayTotalClp = suma de todos los costos del día`
        }],
      });

      const cityRaw = (msg.content[0] as { type: string; text: string }).text;
      console.log(`[itinerary] city ${city} raw length:`, cityRaw.length, "preview:", cityRaw.slice(0, 150));
      const result = safeParseJson(cityRaw) as { days: DayPlan[] };
      console.log(`[itinerary] city ${city} parsed ok, days:`, result.days?.length);
      return result.days ?? [];
    }));

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
      transportLegs: allCities.map((city, i) => {
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
      }),
      accommodations: accs,
      hotelRecommendations: {} as Record<string, HotelRecommendation[]>,
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
