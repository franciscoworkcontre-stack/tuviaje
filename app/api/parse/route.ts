import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "No text" }, { status: 400 });

  const today = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 700,
    messages: [{
      role: "user",
      content: `Eres el parser de tuviaje.com. Extrae info de este texto de viaje y devuelve SOLO JSON.

Texto: "${text}"
Hoy: ${today} (mes actual: ${currentMonth + 1}, año: ${currentYear})

═══ ALIASES DE CIUDADES ═══
BA / BsAs / Baires / Buenos → Buenos Aires
Mvd / Monte → Montevideo
SP / Sampa / Sao Paulo → São Paulo
Rio / RJ → Río de Janeiro
CDMX / DF / México (país) → Ciudad de México
Medallo → Medellín
Barna / BCN → Barcelona
NY / Nueva York → Nueva York
Cusco / Machu Picchu → [Lima, Cusco]

═══ PAÍS → CIUDADES DEFAULT ═══
Argentina (sin ciudad) → [Buenos Aires]
Brasil (sin ciudad) → [São Paulo, Río de Janeiro]
Perú (sin ciudad) → [Lima, Cusco]
Colombia (sin ciudad) → [Bogotá, Cartagena]
México (sin ciudad) → [Ciudad de México]
Patagonia → [Bariloche, El Calafate]

═══ PERÍODOS COMUNES → FECHAS ═══
semana santa / pascua / easter → abril (flexible)
verano / summer / vacaciones de verano → junio-agosto si hemisferio norte, diciembre-febrero si sur (flexible)
navidad / christmas → diciembre 24-26
año nuevo / new year / fin de año → diciembre 28 - enero 5
vacaciones de invierno → julio (flexible, hemisferio sur)

═══ VIAJEROS ═══
solo / sola / yo solo → adults: 1
mi esposa/marido/pareja/pololo/novia y yo → adults: 2
en pareja / nosotros dos → adults: 2
luna de miel / honeymoon → adults: 2, travelStyle: "premium"
con mis papás / con mis padres → adults: 3 (o preguntar)
familia / con mis hijos → needs clarification sobre cantidad
somos N / vamos N / grupo de N → adults: N

═══ ESTILO ═══
mochilero / mochila / backpacker / económico / barato / hostales → "mochilero"
lujo / lujoso / 5 estrellas / lo mejor / sin mirar precio / business / luna de miel → "premium"
default → "comfort"

═══ FLEXIBLE vs EXACTO ═══
flexible=TRUE: solo menciona el mes o período SIN día específico
  Ejemplos: "en julio", "2 semanas en agosto", "para semana santa", "en el verano"
flexible=FALSE: da días exactos
  Ejemplos: "del 10 al 24 julio", "saliendo el 15 de agosto", "el 3 de octubre"

═══ NECESITA CLARIFICACIÓN ═══
needsClarification=true cuando:
- No hay ciudades detectables Y no hay país inferible ("quiero viajar", "necesito salir de Santiago")
- País muy genérico: "Europa", "Asia", "el Caribe" (múltiples países)
- No hay fechas NI duración ("quiero ir a BA" sin ninguna referencia de tiempo)
- Pregunta abierta: "¿a dónde me recomiendas ir?"

En estos casos pon la pregunta más corta posible en clarificationQuestion.

═══ JSON a devolver ═══
{
  "originCity": "Santiago",
  "destinationCities": ["Buenos Aires", "Montevideo"],
  "daysPerCity": [7, 7],
  "departureDate": null,
  "adults": 2,
  "travelStyle": "comfort",
  "flexible": true,
  "flexibleMonth": "julio",
  "flexibleYear": ${currentYear},
  "flexibleDurationDays": 14,
  "needsClarification": false,
  "clarificationQuestion": null
}

Reglas finales:
- flexibleYear: si el mes ya pasó este año, usa ${currentYear + 1}
- daysPerCity: distribuye los días totales entre ciudades. "2 semanas en BA y Montevideo" → [7,7]. "4 días BA y 3 Mvd" → [4,3]. Default 4 días c/u.
- Si hay needsClarification=true, igual intenta llenar todo lo que puedas con lo que hay.`
    }]
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonText = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  try {
    return NextResponse.json(JSON.parse(jsonText));
  } catch {
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
