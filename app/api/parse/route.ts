import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "No text" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: `Extrae la información de este plan de viaje. Devuelve SOLO JSON, sin texto extra.

Texto: "${text}"
Hoy: ${today}
Origen asumido: Santiago

JSON a devolver:
{
  "originCity": "Santiago",
  "destinationCities": ["Buenos Aires", "Montevideo"],
  "daysPerCity": [4, 3],
  "departureDate": "YYYY-MM-DD",
  "adults": 2,
  "travelStyle": "comfort",
  "flexible": false,
  "flexibleMonth": null,
  "flexibleYear": null,
  "flexibleDurationDays": null
}

Reglas:
- flexible: true si el usuario dice "en julio", "en agosto", "vacaciones de invierno", "cualquier semana de X", "las mejores fechas en X" — es decir, NO especifica días exactos, solo el mes o período general.
- Si flexible=true: pon flexibleMonth (nombre del mes en español minúscula), flexibleYear (número), flexibleDurationDays (total de días del viaje). departureDate puede ser null.
- Si flexible=false: departureDate es la fecha exacta. Si dice "julio" sin día específico usa el 10. Año futuro más cercano.
- daysPerCity: si dice "2 semanas" para 2 ciudades → [7, 7]. Si dice "4 días en BA y 3 en Montevideo" → [4, 3]. Default: 4 días por ciudad.
- adults: "mi esposa y yo"/"nosotros dos" → 2, "somos 3" → 3. Default: 2.
- travelStyle: "mochilero" si dice mochilero/hostal/económico. "premium" si dice lujo/5 estrellas. Default: "comfort".
- destinationCities: nombres correctamente capitalizados. Máximo 5.`
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonText = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  try {
    const parsed = JSON.parse(jsonText);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
