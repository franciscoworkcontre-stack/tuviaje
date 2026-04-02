import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "No text" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: `Extrae la información de este plan de viaje y devuelve SOLO JSON válido, sin texto extra.

Texto del usuario: "${text}"
Fecha de hoy: ${today}
Ciudad de origen asumida: Santiago (a menos que el usuario diga otra)

Devuelve este JSON:
{
  "originCity": "Santiago",
  "destinationCities": ["Buenos Aires", "Montevideo"],
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "adults": 2,
  "travelStyle": "comfort"
}

Reglas:
- startDate y endDate: usa el año más cercano futuro. Si el usuario dice "julio" sin año y ya pasó julio ${today.slice(0,4)}, usa ${parseInt(today.slice(0,4)) + 1}.
- Si el usuario dice "del 10 al 25 de julio", startDate = ese 10 de julio, endDate = ese 25 de julio.
- Si no menciona días específicos pero sí el mes, usa como startDate el día 10 del mes y calcula endDate según los días/semanas mencionados.
- Si no menciona fechas, usa startDate = 2 meses desde hoy.
- adults: si dice "mi esposa y yo", "mi pareja y yo", "nosotros dos" → 2. Si dice "somos 3" → 3. Default: 2.
- travelStyle: "mochilero" si menciona mochilero/hostal/económico/barato. "premium" si menciona lujo/5 estrellas/business. Default: "comfort".
- destinationCities: nombres propios correctamente capitalizados en español. Máximo 5 ciudades.`
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
