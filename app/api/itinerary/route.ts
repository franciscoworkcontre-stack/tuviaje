import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { Trip, PlanningInput, DayPlan, CostBreakdown, Traveler } from "@/types/trip";

const client = new Anthropic();

const STYLE_BUDGETS = {
  mochilero:  { hotel: 20000, food: 15000, activities: 8000,  local: 3000 },
  comfort:    { hotel: 60000, food: 35000, activities: 20000, local: 6000 },
  premium:    { hotel: 150000,food: 80000, activities: 50000, local: 12000 },
};

const TRAVELER_EMOJIS = ["🧑","👩","🧔","👱","🧕","👨‍🦱","👩‍🦰","🧒"];
const TRAVELER_COLORS = ["#1565C0","#FF7043","#2E7D32","#7B1FA2","#F9A825","#546E7A","#E64A19","#0D47A1"];

export async function POST(req: NextRequest) {
  try {
    const input: PlanningInput = await req.json();
    const { adults, travelStyle, originCity, destinationCities, startDate, endDate } = input;

    const totalDays = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const allCities = destinationCities;
    const daysPerCity = Math.floor((totalDays - allCities.length) / allCities.length);
    const budget = STYLE_BUDGETS[travelStyle];

    const systemPrompt = `Eres el planificador de viajes de tu[viaje]. Generas itinerarios día a día para viajeros latinoamericanos.

REGLAS:
- Responde SOLO en JSON válido, sin markdown ni texto extra
- Cada día tiene: morning (2-3 actividades), lunch (3 opciones), afternoon (2-3), dinner (3 opciones), eveningActivity (opcional)
- Optimiza por proximidad geográfica: actividades del mismo barrio juntas
- Si es primera vez: incluye los imperdibles + 1 hidden gem por día
- Incluye tiempos realistas de traslado
- Estima costos en CLP para ${travelStyle}
- Los días de viaje (travel_day) tienen solo la info del transporte, sin actividades
- Tono: amigo viajero experimentado, no guía turístico formal
- Español chileno natural`;

    const userPrompt = `Planifica este viaje:
Origen: ${originCity}
Ciudades: ${allCities.join(" → ")}
Fechas: ${startDate} al ${endDate} (${totalDays} días)
Viajeros: ${adults} adultos
Estilo: ${travelStyle}
Días por ciudad: ~${daysPerCity} días cada una

Genera el JSON completo del viaje. Estructura:
{
  "title": "...",
  "days": [
    {
      "dayNumber": 1,
      "city": "...",
      "date": "YYYY-MM-DD",
      "theme": "...",
      "isTravelDay": false,
      "morning": [{"time":"09:00","durationMin":60,"name":"...","category":"culture","description":"...","costClp":0,"address":"...","tip":"...","emoji":"🏛️","rating":4.5}],
      "lunch": {"options":[{"name":"...","cuisine":"...","priceTier":"$$","costClp":12000,"rating":4.3}],"recommended":"..."},
      "afternoon": [...],
      "dinner": {"options":[...],"recommended":"..."},
      "eveningActivity": null,
      "localTransportCostClp": 4000,
      "dayTotalClp": 95000
    }
  ],
  "accommodations": [
    {"city":"...","name":"...","stars":3,"rating":4.2,"pricePerNight":45000,"nights":3,"totalCost":135000,"neighborhood":"..."}
  ],
  "savingsTip": "...",
  "optimizerTips": ["Si viajas el jueves ahorras $18.000 en el vuelo","El museo X es gratis los miércoles"]
}`;

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text;

    // Strip markdown code fences if present
    const jsonText = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const generated = JSON.parse(jsonText);

    // Build cost breakdown
    const hotelTotal = (generated.accommodations as { totalCost: number }[]).reduce(
      (sum: number, a: { totalCost: number }) => sum + a.totalCost, 0
    );
    const foodTotal = (generated.days as DayPlan[]).reduce((sum, d) => {
      if (d.isTravelDay) return sum;
      const lunchCost = d.lunch?.options?.[0]?.costClp ?? budget.food / 2;
      const dinnerCost = d.dinner?.options?.[0]?.costClp ?? budget.food / 2;
      return sum + lunchCost + dinnerCost;
    }, 0) * adults;
    const activitiesTotal = (generated.days as DayPlan[]).reduce((sum, d) => {
      const acts = [...(d.morning ?? []), ...(d.afternoon ?? [])];
      return sum + acts.reduce((s, a) => s + (a.costClp ?? 0), 0);
    }, 0) * adults;
    const localTotal = (generated.days as DayPlan[]).reduce(
      (sum, d) => sum + (d.localTransportCostClp ?? 0), 0
    ) * adults;
    const transportEstimate = allCities.length * 45000 * adults; // placeholder until real APIs
    const extras = Math.round((hotelTotal + foodTotal + activitiesTotal) * 0.06);
    const total = transportEstimate + hotelTotal + foodTotal + activitiesTotal + localTotal + extras;

    const costs: CostBreakdown = {
      transport: transportEstimate,
      accommodation: hotelTotal,
      food: foodTotal,
      activities: activitiesTotal,
      localTransport: localTotal,
      extras,
      total,
      perPerson: Math.round(total / adults),
      perDayPerPerson: Math.round(total / adults / totalDays),
      byCityClp: Object.fromEntries(allCities.map((c) => [c, Math.round(total / allCities.length)])),
    };

    // Build traveler list from adults count
    const travelers_list: Traveler[] = Array.from({ length: adults }, (_, i) => ({
      id: `t-${i}`,
      name: i === 0 ? "Tú" : `Persona ${i + 1}`,
      emoji: TRAVELER_EMOJIS[i % TRAVELER_EMOJIS.length],
      color: TRAVELER_COLORS[i % TRAVELER_COLORS.length],
    }));

    const trip: Trip = {
      id: `trip-${Date.now()}`,
      title: generated.title ?? `${originCity} → ${allCities.join(" → ")}`,
      originCity,
      cities: allCities.map((name, i) => ({
        name,
        country: "",
        days: daysPerCity,
        firstTime: true,
        interests: [],
      })),
      startDate,
      endDate,
      totalDays,
      travelers: { adults, children: input.children },
      travelStyle,
      budgetMaxClp: input.budgetMaxClp,
      transportLegs: allCities.map((city, i) => ({
        fromCity: i === 0 ? originCity : allCities[i - 1],
        toCity: city,
        selected: undefined,
        options: [],
      })),
      accommodations: generated.accommodations ?? [],
      days: generated.days ?? [],
      costs,
      travelers_list,
      splitAssignments: [],
      currency: "CLP",
      createdAt: new Date().toISOString(),
      savingsTip: generated.savingsTip,
      optimizerTips: generated.optimizerTips ?? [],
    } as Trip & { savingsTip?: string; optimizerTips?: string[] };

    return NextResponse.json({ trip });
  } catch (err) {
    console.error("[itinerary]", err);
    return NextResponse.json(
      { error: "Error generando el itinerario. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
