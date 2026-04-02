import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { HotelRecommendation } from "@/types/trip";

export const runtime = "edge";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { cities, travelStyle } = await req.json() as { cities: string[]; travelStyle: string };

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: `Recomienda hoteles para viajeros desde Chile. Devuelve SOLO JSON válido.

Ciudades: ${cities.join(", ")}
Estilo: ${travelStyle}

JSON:
{
  ${cities.map(c => `"${c}": [
    {"name":"...","neighborhood":"...","stars":4,"pricePerNightClp":70000,"rating":8.5,"style":"boutique","pros":["...","...","..."],"cons":["...","..."]}
  ]`).join(",\n  ")}
}

Reglas:
- 4 hoteles reales por ciudad, ordenados mejor relación calidad/precio para ${travelStyle}
- mochilero: 15-35k CLP/noche (hostales y guesthouses)
- comfort: 50-120k CLP/noche (hoteles 3-4★)
- premium: 150k+ CLP/noche (hoteles 5★ y boutique)
- pros: 3 puntos específicos y útiles
- cons: 2 puntos honestos
- style: "hostal" | "boutique" | "business" | "apart-hotel" | "resort"
- Solo hoteles/hostales que realmente existen`
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonText = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  try {
    const recs = JSON.parse(jsonText) as Record<string, HotelRecommendation[]>;
    // Add booking search URLs
    for (const city of Object.keys(recs)) {
      recs[city] = recs[city].map(h => ({
        ...h,
        bookingSearchUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(h.name + " " + city)}&lang=es`,
      }));
    }
    return NextResponse.json({ hotelRecommendations: recs });
  } catch {
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
