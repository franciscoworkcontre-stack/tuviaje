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
      max_tokens: 1200,
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

      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: `Genera itinerario detallado para ${cityDays} días en ${city}.
Estilo: ${travelStyle} | Llegada: ${arrival} | ${adults} viajeros
SOLO JSON válido, sin markdown.

{
  "days": [
    {
      "dayNumber": 1,
      "city": "${city}",
      "date": "${arrival}",
      "theme": "Llegada y primer barrio",
      "isTravelDay": true,
      "morning": [],
      "lunch": {"options":[{"name":"...","cuisine":"...","priceTier":"$$","costClp":12000}],"recommended":"..."},
      "afternoon": [],
      "dinner": {"options":[{"name":"...","cuisine":"...","priceTier":"$$","costClp":18000}],"recommended":"..."},
      "localTransportCostClp": 3000,
      "dayTotalClp": 40000
    },
    {
      "dayNumber": 2,
      "city": "${city}",
      "date": "YYYY-MM-DD",
      "theme": "Barrio histórico y arte",
      "isTravelDay": false,
      "morning": [
        {"time":"09:00","durationMin":90,"name":"...","category":"culture","costClp":0,"tip":"tip concreto y útil","emoji":"🏛️"},
        {"time":"11:00","durationMin":60,"name":"...","category":"culture","costClp":5000,"tip":"...","emoji":"🎨"}
      ],
      "lunch": {"options":[{"name":"...","cuisine":"...","priceTier":"$$","costClp":14000}],"recommended":"..."},
      "afternoon": [
        {"time":"15:00","durationMin":120,"name":"...","category":"culture","costClp":8000,"tip":"...","emoji":"🎭"},
        {"time":"17:30","durationMin":60,"name":"...","category":"food","costClp":0,"tip":"...","emoji":"🍷"}
      ],
      "dinner": {"options":[{"name":"...","cuisine":"...","priceTier":"$$$","costClp":22000}],"recommended":"..."},
      "localTransportCostClp": 4000,
      "dayTotalClp": 85000
    }
  ]
}

REGLAS IMPORTANTES:
- Exactamente ${cityDays} días
- Día 1: isTravelDay=true, morning=[], afternoon=[]
- Días normales: 2 actividades en morning, 2 en afternoon
- 1 sola opción en lunch y dinner
- Fechas consecutivas desde ${arrival}
- Actividades y restaurantes reales y específicos de ${city}
- Tips útiles, concretos, no genéricos ("llega antes de las 10", "pide el menú del día")
- Costos en CLP realistas para ${travelStyle}
- dayTotalClp = suma real de todos los costos del día`
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
