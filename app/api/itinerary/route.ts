import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import type { PlanningInput, DayPlan, CostBreakdown, Traveler, HotelRecommendation } from "@/types/trip";

// Edge runtime: no 10s Node.js limit, better streaming support
export const runtime = "edge";

const STYLE_BUDGETS = {
  mochilero:  { hotel: 20000, food: 15000, activities: 8000,  local: 3000 },
  comfort:    { hotel: 60000, food: 35000, activities: 20000, local: 6000 },
  premium:    { hotel: 150000, food: 80000, activities: 50000, local: 12000 },
};

const TRAVELER_EMOJIS = ["🧑","👩","🧔","👱","🧕","👨‍🦱","👩‍🦰","🧒"];
const TRAVELER_COLORS = ["#1565C0","#FF7043","#2E7D32","#7B1FA2","#F9A825","#546E7A","#E64A19","#0D47A1"];

function buildFlightUrl(from: string, to: string, fromIata?: string, toIata?: string, date?: string, pax?: number): string {
  const dateStr = (date ?? "").slice(0, 10);
  if (fromIata && toIata && dateStr) {
    return `https://www.google.com/travel/flights#flt=${fromIata}.${toIata}.${dateStr};c:CLP;e:${pax ?? 1};sd:1;t:f`;
  }
  return `https://www.google.com/travel/flights/search?q=${encodeURIComponent(`vuelos de ${from} a ${to}${dateStr ? ` el ${dateStr}` : ""}`)}&hl=es`;
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

  // Simplified prompt — fewer tokens, faster generation
  const prompt = `Planifica este viaje y devuelve SOLO JSON válido, sin markdown.

Origen: ${originCity}
Ciudades: ${allCities.join(" → ")}
Fechas: ${startDate} al ${endDate} (${totalDays} días)
Viajeros: ${adults} adultos · Estilo: ${travelStyle}
Días por ciudad: ${allCities.map((c, i) => `${c}: ${daysPerCity(i)} días`).join(", ")}

Estructura JSON:
{
  "title": "Santiago → Buenos Aires → Montevideo",
  "transportLegs": [{"fromCity":"Santiago","toCity":"Buenos Aires","fromIata":"SCL","toIata":"EZE","date":"YYYY-MM-DD"}],
  "days": [
    {
      "dayNumber": 1,
      "city": "Buenos Aires",
      "date": "YYYY-MM-DD",
      "theme": "Llegada y Palermo",
      "isTravelDay": true,
      "morning": [],
      "lunch": {"options":[{"name":"...","cuisine":"...","priceTier":"$$","costClp":12000}],"recommended":"..."},
      "afternoon": [],
      "dinner": {"options":[{"name":"...","cuisine":"...","priceTier":"$$","costClp":18000}],"recommended":"..."},
      "localTransportCostClp": 3000,
      "dayTotalClp": 45000
    },
    {
      "dayNumber": 2,
      "city": "Buenos Aires",
      "date": "YYYY-MM-DD",
      "theme": "San Telmo y La Boca",
      "isTravelDay": false,
      "morning": [{"time":"09:00","durationMin":90,"name":"Feria de San Telmo","category":"culture","costClp":0,"tip":"Llega antes de las 10 para evitar las multitudes","emoji":"🎨"}],
      "lunch": {"options":[{"name":"...","cuisine":"argentina","priceTier":"$$","costClp":14000}],"recommended":"..."},
      "afternoon": [{"time":"15:00","durationMin":120,"name":"Caminito","category":"culture","costClp":0,"tip":"...","emoji":"🎭"}],
      "dinner": {"options":[{"name":"...","cuisine":"parrilla","priceTier":"$$$","costClp":22000}],"recommended":"..."},
      "localTransportCostClp": 4000,
      "dayTotalClp": 85000
    }
  ],
  "accommodations": [
    {"city":"Buenos Aires","name":"Hotel Boutique Palermo","stars":4,"rating":8.6,"pricePerNight":65000,"nights":4,"totalCost":260000,"neighborhood":"Palermo Soho"}
  ],
  "hotelRecommendations": {
    "Buenos Aires": [
      {"name":"...","neighborhood":"...","stars":4,"pricePerNightClp":70000,"rating":8.5,"style":"boutique","pros":["...","...","..."],"cons":["...","..."]}
    ]
  },
  "savingsTip": "Compra la SUBE el primer día, ahorra en transporte",
  "optimizerTips": ["El Museo Nacional de Bellas Artes es gratis","Los vuelos del martes son 20% más baratos"]
}

REGLAS:
- morning: 2 actividades por día normal (no días de viaje)
- afternoon: 2 actividades por día normal
- Solo 1 opción en lunch.options y dinner.options (la mejor para el estilo ${travelStyle})
- Días de viaje: morning=[], afternoon=[], solo lunch y dinner
- hotelRecommendations: exactamente 3 hoteles reales por ciudad destino
- Costos en CLP realistas para ${travelStyle}
- IATA codes correctos para todas las ciudades
- Español chileno natural, tips útiles y específicos`;

  const client = new Anthropic();

  // Stream the Claude response directly to the client
  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 7000,
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        // After streaming the raw JSON, stream the metadata as a JSON suffix
        // We use a separator the client can detect
        const finalMessage = await stream.finalMessage();
        const rawText = finalMessage.content[0].type === "text" ? finalMessage.content[0].text : "";

        // Parse and build trip, then send as final chunk
        const jsonText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
        const generated = JSON.parse(jsonText);

        const hotelTotal = (generated.accommodations ?? []).reduce(
          (sum: number, a: { totalCost: number }) => sum + (a.totalCost ?? 0), 0
        );
        const foodTotal = (generated.days as DayPlan[]).reduce((sum, d) => {
          if (d.isTravelDay) return sum;
          return sum + (d.lunch?.options?.[0]?.costClp ?? budget.food / 2) + (d.dinner?.options?.[0]?.costClp ?? budget.food / 2);
        }, 0) * adults;
        const activitiesTotal = (generated.days as DayPlan[]).reduce((sum, d) => {
          return sum + [...(d.morning ?? []), ...(d.afternoon ?? [])].reduce((s: number, a: { costClp?: number }) => s + (a.costClp ?? 0), 0);
        }, 0) * adults;
        const localTotal = (generated.days as DayPlan[]).reduce((sum, d) => sum + (d.localTransportCostClp ?? 0), 0) * adults;
        const transportEstimate = allCities.length * 45000 * adults;
        const extras = Math.round((hotelTotal + foodTotal + activitiesTotal) * 0.06);
        const total = transportEstimate + hotelTotal + foodTotal + activitiesTotal + localTotal + extras;

        const costs: CostBreakdown = {
          transport: transportEstimate, accommodation: hotelTotal, food: foodTotal,
          activities: activitiesTotal, localTransport: localTotal, extras, total,
          perPerson: Math.round(total / adults),
          perDayPerPerson: Math.round(total / adults / Math.max(totalDays, 1)),
          byCityClp: Object.fromEntries(allCities.map((c) => [c, Math.round(total / allCities.length)])),
        };

        const generatedLegs = (generated.transportLegs ?? []) as Array<{ fromCity: string; toCity: string; fromIata?: string; toIata?: string; date?: string }>;

        const travelers_list: Traveler[] = Array.from({ length: adults }, (_, i) => ({
          id: `t-${i}`,
          name: i === 0 ? "Tú" : `Persona ${i + 1}`,
          emoji: TRAVELER_EMOJIS[i % TRAVELER_EMOJIS.length],
          color: TRAVELER_COLORS[i % TRAVELER_COLORS.length],
        }));

        const trip = {
          id: `trip-${Date.now()}`,
          title: generated.title ?? `${originCity} → ${allCities.join(" → ")}`,
          originCity,
          cities: allCities.map((name, i) => ({ name, country: "", days: daysPerCity(i), firstTime: true, interests: [] })),
          startDate, endDate, totalDays,
          travelers: { adults, children: input.children ?? 0 },
          travelStyle,
          budgetMaxClp: input.budgetMaxClp,
          transportLegs: allCities.map((city, i) => {
            const legData = generatedLegs.find((l) => l.toCity?.toLowerCase() === city.toLowerCase());
            const fromCity = i === 0 ? originCity : allCities[i - 1];
            const travelDay = (generated.days as DayPlan[]).find((d) => d.isTravelDay && d.city === city);
            const legDate = legData?.date ?? travelDay?.date ?? startDate;
            return {
              fromCity, toCity: city,
              fromIata: legData?.fromIata, toIata: legData?.toIata, date: legDate,
              flightSearchUrl: buildFlightUrl(fromCity, city, legData?.fromIata, legData?.toIata, legDate, adults),
              selected: undefined, options: [],
            };
          }),
          accommodations: generated.accommodations ?? [],
          hotelRecommendations: (generated.hotelRecommendations ?? {}) as Record<string, HotelRecommendation[]>,
          days: generated.days ?? [],
          costs,
          travelers_list,
          splitAssignments: [],
          currency: "CLP",
          createdAt: new Date().toISOString(),
          savingsTip: generated.savingsTip,
          optimizerTips: generated.optimizerTips ?? [],
        };

        // Send the final trip object as a special delimiter chunk
        const finalChunk = `\n___TRIP_JSON___${JSON.stringify({ trip })}`;
        controller.enqueue(encoder.encode(finalChunk));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`\n___ERROR___${msg}`));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no", // disable nginx buffering
      "Cache-Control": "no-cache",
    },
  });
}
