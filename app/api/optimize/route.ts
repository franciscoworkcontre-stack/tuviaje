import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Trip } from "@/types/trip";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const client = new Anthropic();

export type SavingsCategory = "accommodation" | "food" | "activities" | "localTransport";

export interface OptimizationTip {
  id: string;
  category: "ahorro" | "experiencia" | "logistica" | "comida" | "transporte";
  emoji: string;
  title: string;
  detail: string;
  // For savings tips: pct off a specific cost category (calculated client-side)
  savingsPct?: number;           // e.g. 15
  appliesToCategory?: SavingsCategory; // which trip.costs.* to apply pct to
  savingsExplanation?: string;   // e.g. "reservando con 6 semanas de anticipación"
}

export async function POST(req: NextRequest) {
  try {
    const { trip } = await req.json() as { trip: Trip };
    if (!trip) return NextResponse.json({ error: "No trip" }, { status: 400 });

    const cityList = trip.cities.map(c => `${c.name} (${c.days} días)`).join(", ");
    const style = trip.travelStyle;

    const prompt = `Eres experto en viajes y optimización de presupuesto. Analiza este viaje y genera tips concretos y honestos.

VIAJE:
- Destinos: ${cityList}
- Fechas: ${trip.startDate} → ${trip.endDate} (${trip.totalDays} días)
- Estilo: ${style} | ${trip.travelers.adults} adultos
- Costos reales:
  - Alojamiento: $${Math.round(trip.costs.accommodation / 950).toLocaleString()} USD
  - Comida: $${Math.round(trip.costs.food / 950).toLocaleString()} USD
  - Actividades: $${Math.round(trip.costs.activities / 950).toLocaleString()} USD
  - Transporte local: $${Math.round(trip.costs.localTransport / 950).toLocaleString()} USD
  - Extras: $${Math.round(trip.costs.extras / 950).toLocaleString()} USD

FORMATO — responde SOLO JSON válido:
{
  "tips": [
    {
      "id": "tip-1",
      "category": "ahorro|experiencia|logistica|comida|transporte",
      "emoji": "💡",
      "title": "Título corto (máx 8 palabras)",
      "detail": "Explicación concreta (máx 2 oraciones). Menciona ciudades, apps, lugares específicos.",
      "savingsPct": 15,
      "appliesToCategory": "accommodation",
      "savingsExplanation": "reservando con 6+ semanas de anticipación"
    }
  ]
}

REGLAS ESTRICTAS para tips de ahorro (category=ahorro):
- savingsPct DEBE ser un % realista y justificable (ej: anticipación = 10-20%, cocinar = 30-50% comida, hostal = 30-40% alojamiento)
- appliesToCategory DEBE ser uno de: "accommodation", "food", "activities", "localTransport"
- savingsExplanation explica en pocas palabras POR QUÉ ese % es válido
- Solo incluye tips de ahorro si el % es genuinamente alcanzable — no inflés

Para tips sin ahorro monetario (experiencia, logistica, comida, transporte): omite savingsPct y appliesToCategory.

Genera exactamente 5 tips: 2 de ahorro con %, 1 de experiencia, 1 logístico, 1 de comida o transporte.`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}";
    // Strip markdown code fences if present
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const jsonStart = stripped.indexOf("{");
    const jsonEnd = stripped.lastIndexOf("}") + 1;
    // Remove trailing commas before } or ] which Claude sometimes emits
    const cleaned = stripped
      .slice(jsonStart, jsonEnd)
      .replace(/,(\s*[}\]])/g, "$1");
    const parsed = JSON.parse(cleaned) as { tips: OptimizationTip[] };

    return NextResponse.json({ tips: parsed.tips ?? [] });
  } catch (err) {
    console.error("[optimize]", err);
    return NextResponse.json({ tips: [] }, { status: 500 });
  }
}
