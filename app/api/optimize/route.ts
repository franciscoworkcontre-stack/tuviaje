import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Trip } from "@/types/trip";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const client = new Anthropic();

export interface OptimizationTip {
  id: string;
  category: "ahorro" | "experiencia" | "logistica" | "comida" | "transporte";
  emoji: string;
  title: string;
  detail: string;
  savingsClp?: number; // estimated CLP savings if applicable
}

export async function POST(req: NextRequest) {
  try {
    const { trip } = await req.json() as { trip: Trip };
    if (!trip) return NextResponse.json({ error: "No trip" }, { status: 400 });

    const cityList = trip.cities.map(c => `${c.name} (${c.days} días)`).join(", ");
    const totalClp = trip.costs.total;
    const perPersonClp = trip.costs.perPerson;
    const style = trip.travelStyle;

    const prompt = `Eres un experto en viajes por Sudamérica y optimización de presupuesto de viaje.

Analiza este viaje y entrega EXACTAMENTE 6 tips de optimización muy concretos y accionables:

VIAJE:
- Destinos: ${cityList}
- Fechas: ${trip.startDate} → ${trip.endDate} (${trip.totalDays} días)
- Estilo: ${style}
- Presupuesto total: $${Math.round(totalClp).toLocaleString("es-CL")} CLP
- Por persona: $${Math.round(perPersonClp).toLocaleString("es-CL")} CLP
- Viajeros: ${trip.travelers.adults} adultos
- Costos por categoría:
  - Transporte: $${Math.round(trip.costs.transport).toLocaleString("es-CL")} CLP
  - Alojamiento: $${Math.round(trip.costs.accommodation).toLocaleString("es-CL")} CLP
  - Comida: $${Math.round(trip.costs.food).toLocaleString("es-CL")} CLP
  - Actividades: $${Math.round(trip.costs.activities).toLocaleString("es-CL")} CLP
  - Transporte local: $${Math.round(trip.costs.localTransport).toLocaleString("es-CL")} CLP
  - Extras: $${Math.round(trip.costs.extras).toLocaleString("es-CL")} CLP

Responde SOLO con JSON válido, sin texto adicional, con este formato exacto:
{
  "tips": [
    {
      "id": "tip-1",
      "category": "ahorro|experiencia|logistica|comida|transporte",
      "emoji": "💡",
      "title": "Título corto (máx 8 palabras)",
      "detail": "Explicación concreta y accionable (máx 2 oraciones). Incluye nombres específicos de apps, lugares o técnicas.",
      "savingsClp": 50000
    }
  ]
}

Reglas:
- Cada tip debe ser MUY específico para este viaje (menciona ciudades, fechas, categorías del viaje)
- Al menos 2 tips de ahorro con estimación de CLP ahorrado
- Al menos 1 tip de experiencia (algo que la gente no sabe)
- Al menos 1 tip logístico (transporte, timing, apps)
- Sé directo y usa datos concretos, no generalidades
- Los savingsClp solo en tips de ahorro; usa null para los demás`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd)) as { tips: OptimizationTip[] };

    return NextResponse.json({ tips: parsed.tips ?? [] });
  } catch (err) {
    console.error("[optimize]", err);
    return NextResponse.json({ tips: [] }, { status: 500 });
  }
}
