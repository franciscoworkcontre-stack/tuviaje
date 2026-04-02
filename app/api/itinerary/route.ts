import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import type { PlanningInput, DayPlan, CostBreakdown, Traveler, HotelRecommendation } from "@/types/trip";

export const runtime = "edge";

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
  return `https://www.google.com/travel/flights/search?q=${encodeURIComponent(`vuelos ${from} ${to}${d ? ` ${d}` : ""}`)}&hl=es`;
}

function safeParseJson(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  // Escape literal control chars inside strings
  let s = "";
  let inStr = false, esc = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i], code = cleaned.charCodeAt(i);
    if (esc) { s += ch; esc = false; continue; }
    if (ch === "\\" && inStr) { s += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; s += ch; continue; }
    if (inStr && code < 0x20) { if (code===10) s+="\\n"; else if (code===13) s+="\\r"; else if (code===9) s+="\\t"; continue; }
    s += ch;
  }
  return JSON.parse(s);
}

async function callHaiku(client: Anthropic, prompt: string, maxTokens: number): Promise<unknown> {
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const text = (msg.content[0] as { type: string; text: string }).text;
  return safeParseJson(text);
}

export async function POST(req: NextRequest) {
  const input: PlanningInput = await req.json();
  const { adults, travelStyle, originCity, destinationCities, startDate, endDate } = input;

  const totalDays = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const allCities = destinationCities;
  const inputDaysPerCity = input.daysPerCity ?? [];
  const daysPerCity = (i: number) =>
    inputDaysPerCity[i] ?? Math.floor((totalDays - allCities.length) / Math.max(allCities.length, 1));
  const budget = STYLE_BUDGETS[travelStyle];
  const client = new Anthropic();

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));
      };

      try {
        // ── LLAMADA 1: Estructura del viaje ──────────────────────────
        send("status", "Armando la estructura del viaje...");

        const structurePrompt = `Planifica la estructura de este viaje. Devuelve SOLO JSON.

Origen: ${originCity} | Destinos: ${allCities.join(" → ")}
Fechas: ${startDate} → ${endDate} (${totalDays} días)
Viajeros: ${adults} | Estilo: ${travelStyle}
Días por ciudad: ${allCities.map((c, i) => `${c}=${daysPerCity(i)}d`).join(", ")}

JSON exacto:
{
  "title": "Santiago → Buenos Aires → Montevideo",
  "transportLegs": [
    {"fromCity":"Santiago","toCity":"Buenos Aires","fromIata":"SCL","toIata":"EZE","date":"${startDate}"}
  ],
  "accommodations": [
    {"city":"Buenos Aires","name":"Hotel Boutique Palermo","stars":4,"rating":8.5,"pricePerNight":65000,"nights":${daysPerCity(0)},"totalCost":${daysPerCity(0) * 65000},"neighborhood":"Palermo Soho"}
  ],
  "cityDates": {
    "${allCities[0]}": {"arrival":"${startDate}","departure":"YYYY-MM-DD"}
  },
  "savingsTip": "Tip concreto de ahorro para este viaje",
  "optimizerTips": ["tip1","tip2"]
}

Reglas:
- IATA codes correctos para ${originCity} y cada destino
- 1 accommodation por ciudad destino
- Precios de hotel en CLP para ${travelStyle}: mochilero 20-40k, comfort 50-120k, premium 150k+
- cityDates: fechas reales de llegada/salida en cada ciudad`;

        const structure = await callHaiku(client, structurePrompt, 1200) as Record<string, unknown>;
        send("structure", structure);

        // ── LLAMADAS 2-N: Actividades por ciudad EN PARALELO ─────────
        send("status", `Generando itinerario para ${allCities.join(" y ")}...`);

        const cityDatesMap = (structure.cityDates ?? {}) as Record<string, { arrival: string; departure: string }>;

        const cityPromises = allCities.map(async (city, cityIdx) => {
          const cityDays = daysPerCity(cityIdx);
          const arrival = cityDatesMap[city]?.arrival ?? startDate;

          const daysPrompt = `Genera el itinerario para ${city} (${cityDays} días, estilo ${travelStyle}).
Llegada: ${arrival} | Viajeros: ${adults}
Devuelve SOLO JSON.

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
      "theme": "Barrio histórico",
      "isTravelDay": false,
      "morning": [
        {"time":"09:00","durationMin":90,"name":"Actividad","category":"culture","costClp":0,"tip":"tip útil","emoji":"🏛️"}
      ],
      "lunch": {"options":[{"name":"...","cuisine":"...","priceTier":"$$","costClp":14000}],"recommended":"..."},
      "afternoon": [
        {"time":"15:00","durationMin":120,"name":"Actividad tarde","category":"culture","costClp":5000,"tip":"tip","emoji":"🎭"}
      ],
      "dinner": {"options":[{"name":"...","cuisine":"...","priceTier":"$$$","costClp":22000}],"recommended":"..."},
      "localTransportCostClp": 4000,
      "dayTotalClp": 85000
    }
  ]
}

Reglas:
- Día 1 siempre isTravelDay=true con morning=[] afternoon=[]
- Días normales: 2 actividades en morning, 2 en afternoon
- 1 sola opción en lunch y dinner (la mejor para ${travelStyle})
- dayTotalClp = suma realista de todo el día
- Actividades reales y específicas de ${city}
- Tips útiles y concretos, no genéricos
- Fechas consecutivas desde ${arrival}
- ${cityDays} días en total`;

          const result = await callHaiku(client, daysPrompt, 2000) as { days: DayPlan[] };
          return { city, days: result.days ?? [] };
        });

        const cityResults = await Promise.all(cityPromises);
        send("status", "Calculando costos...");

        // ── Ensamblar todo ────────────────────────────────────────────
        const allDays: DayPlan[] = [];
        let dayCounter = 1;
        for (const { days } of cityResults) {
          for (const day of days) {
            allDays.push({ ...day, dayNumber: dayCounter++ });
          }
        }

        const accommodations = (structure.accommodations ?? []) as Array<{ totalCost: number; city: string; name: string; stars: number; rating: number; pricePerNight: number; nights: number; neighborhood: string }>;
        const transportLegs = (structure.transportLegs ?? []) as Array<{ fromCity: string; toCity: string; fromIata?: string; toIata?: string; date?: string }>;

        const hotelTotal = accommodations.reduce((s, a) => s + (a.totalCost ?? 0), 0);
        const foodTotal = allDays.reduce((s, d) => {
          if (d.isTravelDay) return s;
          return s + (d.lunch?.options?.[0]?.costClp ?? budget.food / 2) + (d.dinner?.options?.[0]?.costClp ?? budget.food / 2);
        }, 0) * adults;
        const activitiesTotal = allDays.reduce((s, d) =>
          s + [...(d.morning ?? []), ...(d.afternoon ?? [])].reduce((ss: number, a: { costClp?: number }) => ss + (a.costClp ?? 0), 0), 0
        ) * adults;
        const localTotal = allDays.reduce((s, d) => s + (d.localTransportCostClp ?? 0), 0) * adults;
        const transportEstimate = allCities.length * 45000 * adults;
        const extras = Math.round((hotelTotal + foodTotal + activitiesTotal) * 0.06);
        const total = transportEstimate + hotelTotal + foodTotal + activitiesTotal + localTotal + extras;

        const costs: CostBreakdown = {
          transport: transportEstimate, accommodation: hotelTotal,
          food: foodTotal, activities: activitiesTotal,
          localTransport: localTotal, extras, total,
          perPerson: Math.round(total / adults),
          perDayPerPerson: Math.round(total / adults / Math.max(totalDays, 1)),
          byCityClp: Object.fromEntries(allCities.map((c) => [c, Math.round(total / allCities.length)])),
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
            const leg = transportLegs.find(l => l.toCity?.toLowerCase() === city.toLowerCase());
            const fromCity = i === 0 ? originCity : allCities[i - 1];
            const travelDay = allDays.find(d => d.isTravelDay && d.city === city);
            const legDate = leg?.date ?? travelDay?.date ?? startDate;
            return {
              fromCity, toCity: city,
              fromIata: leg?.fromIata, toIata: leg?.toIata, date: legDate,
              flightSearchUrl: buildFlightUrl(fromCity, city, leg?.fromIata, leg?.toIata, legDate, adults),
              selected: undefined, options: [],
            };
          }),
          accommodations,
          hotelRecommendations: {} as Record<string, HotelRecommendation[]>,
          days: allDays, costs, travelers_list,
          splitAssignments: [], currency: "CLP",
          createdAt: new Date().toISOString(),
          savingsTip: structure.savingsTip,
          optimizerTips: (structure.optimizerTips as string[]) ?? [],
        };

        send("done", { trip });
        controller.close();

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[itinerary]", msg);
        send("error", msg);
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
