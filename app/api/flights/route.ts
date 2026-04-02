import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { FlightOption } from "@/types/trip";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Chromium binary hosted on GitHub Releases (~50MB, cached in /tmp after first download)
const CHROMIUM_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar";

const client = new Anthropic();

// Airline-specific booking deep links (pre-filled with route + date)
const AIRLINE_URLS: Record<string, (f: string, t: string, d: string, n: number) => string> = {
  LA: (f, t, d, n) => `https://www.latamairlines.com/cl/es/oferta-vuelos?origin=${f}&destination=${t}&outbound=${d}&adults=${n}&cabin=Y&trip=OW`,
  H2: (f, t, d, n) => `https://www.skyairline.com/vuelos?from=${f}&to=${t}&date=${d}&adults=${n}`,
  JA: (f, t, d, n) => `https://jetsmart.com/cl/es/vuelos?origin=${f}&destination=${t}&departure=${d}&adults=${n}&trip=OW`,
  AR: (f, t, d, n) => `https://www.aerolineas.com.ar/es-ar/vuelos?from=${f}&to=${t}&departure=${d}&cabin=Y&adults=${n}`,
  G3: (f, t, d, n) => `https://www.golairlines.com.br/voos?from=${f}&to=${t}&date=${d}&adults=${n}`,
  AA: (f, t, d, n) => `https://www.aa.com/booking/find-flights?origin=${f}&destination=${t}&departureDate=${d}&numberOfAdults=${n}&cabin=COACH`,
  UA: (f, t, d, n) => `https://www.united.com/es/cl/fsr/choose-flights?f=${f}&t=${t}&d=${d}&px=${n}&sc=7`,
  IB: (f, t, d, n) => `https://www.iberia.com/vuelos/?from=${f}&to=${t}&departure=${d}&adults=${n}&cabin=Y&tripType=OW`,
  CM: (f, t, d, n) => `https://www.copaair.com/es-cl/vuelos/${f}-${t}/?departureDate=${d}&adults=${n}&cabin=Y`,
  AV: (f, t, d, n) => `https://www.avianca.com/cl/es/vuelos/?originAirportCode=${f}&destinationAirportCode=${t}&departureDate=${d}&adults=${n}&tripType=OW`,
};

function airlineUrl(code: string, fromIata: string, toIata: string, date: string, adults: number): string {
  const builder = AIRLINE_URLS[code?.toUpperCase()];
  if (builder) return builder(fromIata, toIata, date, adults);
  // Fallback: Google Flights pre-filtered to this exact route + date
  return `https://www.google.com/travel/flights#flt=${fromIata}.${toIata}.${date};c:CLP;e:${adults};sd:1;t:f`;
}

interface FlightLeg {
  fromCity: string;
  toCity: string;
  fromIata?: string;
  toIata?: string;
  date?: string;
}

interface ScrapedFlight {
  airline: string;
  carrierCode?: string;
  flightNumber?: string;
  departure: string;
  arrival: string;
  durationMin: number;
  stops: number;
  priceClp: number;
}

async function scrapeOneLeg(
  fromIata: string, toIata: string, date: string, adults: number
): Promise<FlightOption[]> {
  // Build Google Flights direct search URL
  const url = `https://www.google.com/travel/flights#flt=${fromIata}.${toIata}.${date};c:CLP;e:${adults};sd:1;t:f`;

  const executablePath = await chromium.executablePath(CHROMIUM_URL);

  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
    defaultViewport: { width: 1440, height: 900 },
    executablePath,
    headless: true,
  });

  let screenshot: Buffer;
  try {
    const page = await browser.newPage();

    // Mimic a real Chrome browser
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "es-CL,es;q=0.9,en;q=0.8" });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Dismiss cookie/consent dialogs if present
    try {
      const consentBtn = await page.$('button[aria-label*="Aceptar"]');
      if (!consentBtn) {
        const rejectBtn = await page.$('button[aria-label*="Accept"]');
        if (rejectBtn) await rejectBtn.click();
      } else {
        await consentBtn.click();
      }
      await new Promise(r => setTimeout(r, 1000));
    } catch {
      // No dialog, continue
    }

    // Wait for flight cards to appear
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('[role="listitem"]').length > 0 || document.querySelectorAll('[jsname]').length > 50,
        { timeout: 20000 }
      );
    } catch {
      // Timeout — take screenshot anyway
    }

    // Extra settle time for prices to load
    await new Promise(r => setTimeout(r, 3000));

    // Screenshot the results (top portion where flights appear)
    screenshot = Buffer.from(await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1440, height: 900 } }));
  } finally {
    await browser.close();
  }

  // Send screenshot to Claude vision for extraction
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2500,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: "image/png", data: screenshot.toString("base64") },
        },
        {
          type: "text",
          text: `Esta es una captura de Google Flights buscando vuelos ${fromIata}→${toIata} el ${date} para ${adults} persona(s).

Extrae TODOS los vuelos visibles. SOLO JSON válido:

{
  "flights": [
    {
      "airline": "LATAM",
      "carrierCode": "LA",
      "flightNumber": "LA704",
      "departure": "07:30",
      "arrival": "10:05",
      "durationMin": 155,
      "stops": 0,
      "priceClp": 89000
    }
  ]
}

REGLAS:
- Extrae hasta 5 vuelos en el orden que aparecen
- priceClp: precio TOTAL en CLP para todos los pasajeros. Si está en USD multiplica x 920
- departure/arrival: formato HH:MM (hora local)
- durationMin: duración total en minutos incluyendo escalas
- stops: 0=directo, 1+=con escalas
- carrierCode: código IATA 2 letras (LA=LATAM, H2=Sky, JA=JetSMART, AR=Aerolíneas, G3=Gol, AA=American)
- Si no hay vuelos visibles o la página no cargó, retorna {"flights":[]}
- SOLO JSON, sin markdown ni explicación`,
        },
      ],
    }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  let flights: ScrapedFlight[] = [];
  try {
    const parsed = JSON.parse(raw) as { flights: ScrapedFlight[] };
    flights = parsed.flights ?? [];
  } catch {
    console.error("[flights] Claude parse error:", raw.slice(0, 200));
    return [];
  }

  if (flights.length === 0) return [];

  // Compute pros/cons from relative comparisons
  const prices = flights.map(f => f.priceClp);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);

  return flights.map(f => {
    const pros: string[] = [];
    const cons: string[] = [];

    if (f.stops === 0) pros.push("Vuelo directo, sin escalas");
    else cons.push(`${f.stops} escala${f.stops > 1 ? "s" : ""} en el camino`);

    if (prices.length > 1) {
      if (f.priceClp <= minP + (maxP - minP) * 0.25) pros.push("El más económico");
      else if (f.priceClp >= maxP - (maxP - minP) * 0.25) cons.push("El más caro de las opciones");
    }

    const depH = parseInt((f.departure ?? "12").split(":")[0]);
    if (depH >= 6 && depH <= 9) pros.push("Sale temprano — llegas con el día");
    else if (depH >= 20 || depH < 5) pros.push("Vuelo nocturno — no pierdes días");
    else if (depH >= 13 && depH <= 17) cons.push("Sale al mediodía, llegas en la tarde");

    if (f.durationMin > 0 && f.durationMin <= 100) pros.push(`Vuelo corto (${Math.round(f.durationMin / 60 * 10) / 10}h)`);

    if (pros.length === 0) pros.push("Aerolínea con experiencia en la ruta");
    if (cons.length === 0) cons.push("Verificar equipaje incluido");

    return {
      airline: f.airline,
      flightNumber: f.flightNumber,
      departure: f.departure,
      arrival: f.arrival,
      durationMin: f.durationMin,
      stops: f.stops,
      priceClp: f.priceClp,
      pros,
      cons,
      // Booking link goes directly to that airline for that exact route+date
      bookingSearchUrl: airlineUrl(f.carrierCode ?? "", fromIata, toIata, date, adults),
    } satisfies FlightOption;
  });
}

export async function POST(req: NextRequest) {
  const { legs, adults } = await req.json() as { legs: FlightLeg[]; adults: number };

  // Run legs sequentially to avoid memory overload from multiple Chromium instances
  const flightOptions: Record<string, FlightOption[]> = {};
  for (const leg of legs) {
    const key = `${leg.fromCity}-${leg.toCity}`;
    if (!leg.fromIata || !leg.toIata || !leg.date) {
      flightOptions[key] = [];
      continue;
    }
    try {
      flightOptions[key] = await scrapeOneLeg(leg.fromIata, leg.toIata, leg.date, adults);
    } catch (e) {
      console.error(`[flights] ${key} failed:`, e instanceof Error ? e.message : e);
      flightOptions[key] = [];
    }
  }

  return NextResponse.json({ flightOptions });
}
