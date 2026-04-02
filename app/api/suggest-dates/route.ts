import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export interface DateSuggestion {
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  badge?: string;      // "⭐ Mejor opción" | "💸 Más barata" | "🌤️ Mejor clima"
  title: string;       // "8 jul → 22 jul"
  reason: string;      // short explanation
  warnings?: string;   // optional caveat
}

export async function POST(req: NextRequest) {
  const { month, year, durationDays, destinations, travelStyle, originCity } = await req.json();

  const today = new Date().toISOString().split("T")[0];

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [{
      role: "user",
      content: `Eres un experto en viajes desde ${originCity ?? "Santiago"} hacia ${destinations?.join(", ")}.
Sugiere las 3 mejores ventanas de ${durationDays} días consecutivos en ${month} ${year} para este viaje.

Considera:
- Precios de vuelos: martes/miércoles/jueves ~20-30% más baratos que viernes/domingo
- Feriados y vacaciones escolares de Chile, Argentina, Uruguay (invierno escolar ~primera quincena julio)
- Temporada alta/baja en cada destino
- Eventos, festivales o fechas que encarecen alojamiento
- Clima en cada ciudad destino en ${month}
- Estilo de viaje: ${travelStyle ?? "comfort"}
- Hoy es: ${today}

Devuelve SOLO este JSON (array de exactamente 3 sugerencias, ordenadas de mejor a peor):
[
  {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "badge": "⭐ Mejor opción",
    "title": "8 jul → 22 jul",
    "reason": "Vuelos baratos saliendo el martes 8, evitas las vacaciones de invierno AR (21 jul), clima seco y frío ideal para BA",
    "warnings": null
  },
  {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "badge": "💸 Más económica",
    "title": "...",
    "reason": "...",
    "warnings": "Mucho turismo local las primeras 2 semanas"
  },
  {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "badge": "🌤️ Mejor clima",
    "title": "...",
    "reason": "...",
    "warnings": null
  }
]`
    }]
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonText = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  try {
    const suggestions: DateSuggestion[] = JSON.parse(jsonText);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
