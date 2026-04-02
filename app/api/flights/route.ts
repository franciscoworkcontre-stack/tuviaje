import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { FlightOption } from "@/types/trip";

export const runtime = "edge";

const client = new Anthropic();

function buildFlightUrl(fromIata: string, toIata: string, date: string, adults: number): string {
  const d = (date ?? "").slice(0, 10);
  if (fromIata && toIata && d)
    return `https://www.google.com/travel/flights#flt=${fromIata}.${toIata}.${d};c:CLP;e:${adults};sd:1;t:f`;
  return `https://www.google.com/travel/flights`;
}

interface FlightLeg {
  fromCity: string;
  toCity: string;
  fromIata?: string;
  toIata?: string;
  date?: string;
}

export async function POST(req: NextRequest) {
  const { legs, travelStyle, adults } = await req.json() as {
    legs: FlightLeg[];
    travelStyle: string;
    adults: number;
  };

  const legKeys = legs.map(l => `${l.fromCity}-${l.toCity}`);

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: `Genera opciones de vuelo realistas para viajeros desde Chile. SOLO JSON válido.

Tramos: ${legs.map(l => `${l.fromCity} (${l.fromIata ?? "?"}) → ${l.toCity} (${l.toIata ?? "?"}), ${l.date ?? "fecha flexible"}`).join(" | ")}
Estilo: ${travelStyle} | Viajeros: ${adults}

JSON exacto:
{
  ${legKeys.map((key, i) => `"${key}": [
    {"airline":"LATAM","flightNumber":"LA704","departure":"07:30","arrival":"10:10","durationMin":160,"stops":0,"priceClp":89000,"pros":["Vuelo directo","Sale de mañana, llega temprano"],"cons":["Hora muy temprana"]},
    {"airline":"Aerolíneas Argentinas","flightNumber":"AR1842","departure":"13:45","arrival":"17:00","durationMin":195,"stops":1,"priceClp":72000,"pros":["Precio más bajo","Horario cómodo"],"cons":["1 escala en Córdoba","30 min más largo"]},
    {"airline":"Sky Airline","flightNumber":"H2205","departure":"19:00","arrival":"22:15","durationMin":135,"stops":0,"priceClp":115000,"pros":["El más rápido","Vuelo nocturno llega de noche"],"cons":["Precio más alto","Sin check-in de equipaje incluido"]}
  ]${i < legKeys.length - 1 ? "," : ""}`).join("\n  ")}
}

REGLAS:
- 3 opciones por tramo con aerolíneas que realmente operan esa ruta
- priceClp por persona en CLP (chile → Argentina: 60k-150k, regionales: 40k-200k)
- mochilero: prioriza el más barato, comfort: balance, premium: el más rápido/cómodo
- stops: 0=directo, 1=una escala
- pros: 2-3 ventajas concretas de esa opción
- cons: 1-2 desventajas honestas
- durationMin incluye escala si aplica
- Ordena de mejor a peor relación calidad/precio para ${travelStyle}`
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonText = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  try {
    const parsed = JSON.parse(jsonText) as Record<string, FlightOption[]>;

    // Attach real booking URLs using IATA codes + date from legs
    for (const leg of legs) {
      const key = `${leg.fromCity}-${leg.toCity}`;
      if (parsed[key]) {
        parsed[key] = parsed[key].map(opt => ({
          ...opt,
          bookingSearchUrl: leg.fromIata && leg.toIata && leg.date
            ? buildFlightUrl(leg.fromIata, leg.toIata, leg.date, adults)
            : `https://www.google.com/travel/flights/search?q=${encodeURIComponent(`vuelos ${leg.fromCity} ${leg.toCity}`)}&hl=es`,
        }));
      }
    }

    return NextResponse.json({ flightOptions: parsed });
  } catch {
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
