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
  "departureDate": null,
  "adults": 2,
  "travelStyle": "comfort",
  "flexible": true,
  "flexibleMonth": "julio",
  "flexibleYear": 2026,
  "flexibleDurationDays": 14
}

REGLA MÁS IMPORTANTE — flexible vs exacto:
- flexible=TRUE cuando el usuario dice solo el MES sin día específico: "en julio", "2 semanas en julio", "agosto", "vacaciones de invierno", "en verano". NO sabe qué días exactos dentro del mes.
- flexible=FALSE solo cuando el usuario da días EXACTOS: "del 10 al 24 de julio", "el 15 de agosto", "saliendo el 3 de julio". Sabe exactamente qué días.

Ejemplos:
- "2 semanas en julio" → flexible=true, flexibleMonth="julio", flexibleDurationDays=14, departureDate=null
- "en agosto, 10 días" → flexible=true, flexibleMonth="agosto", flexibleDurationDays=10, departureDate=null
- "del 10 al 24 de julio" → flexible=false, departureDate="2026-07-10"
- "saliendo el 15 de julio" → flexible=false, departureDate="2026-07-15"

Otras reglas:
- flexibleYear: año futuro más cercano para ese mes desde hoy (${today})
- daysPerCity: si dice "2 semanas" para 2 ciudades → [7, 7]. Si dice "4 días en BA y 3 en Montevideo" → [4, 3]. Default: 4 días por ciudad.
- adults: "mi esposa y yo"/"nosotros dos"/"somos 2" → 2, "somos 3" → 3. Default: 2.
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
