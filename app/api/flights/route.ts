import chromium from "@sparticuz/chromium-min";
import puppeteer, { type Browser } from "puppeteer-core";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { FlightOption } from "@/types/trip";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const CHROMIUM_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar";

const client = new Anthropic();

// Airline booking deep links — pre-filled with route + date
const AIRLINE_URLS: Record<string, (f: string, t: string, d: string, n: number) => string> = {
  LA: (f, t, d, n) => `https://www.latamairlines.com/cl/es/oferta-vuelos?origin=${f}&destination=${t}&outbound=${d}&adults=${n}&cabin=Y&trip=OW`,
  H2: (f, t, d, n) => `https://www.skyairline.com/vuelos?from=${f}&to=${t}&date=${d}&adults=${n}`,
  JA: (f, t, d, n) => `https://jetsmart.com/cl/es/vuelos?origin=${f}&destination=${t}&departure=${d}&adults=${n}&trip=OW`,
  AR: (f, t, d, n) => `https://www.aerolineas.com.ar/es-ar/vuelos?from=${f}&to=${t}&departure=${d}&cabin=Y&adults=${n}`,
  G3: (f, t, d, n) => `https://www.golairlines.com.br/voos?from=${f}&to=${t}&date=${d}&adults=${n}`,
  AA: (f, t, d, n) => `https://www.aa.com/booking/find-flights?origin=${f}&destination=${t}&departureDate=${d}&numberOfAdults=${n}&cabin=COACH`,
  UA: (f, t, d, n) => `https://www.united.com/es/cl/fsr/choose-flights?f=${f}&t=${t}&d=${d}&px=${n}&sc=7`,
  CM: (f, t, d, n) => `https://www.copaair.com/es-cl/vuelos/${f}-${t}/?departureDate=${d}&adults=${n}&cabin=Y`,
  AV: (f, t, d, n) => `https://www.avianca.com/cl/es/vuelos/?originAirportCode=${f}&destinationAirportCode=${t}&departureDate=${d}&adults=${n}&tripType=OW`,
  IB: (f, t, d, n) => `https://www.iberia.com/vuelos/?from=${f}&to=${t}&departure=${d}&adults=${n}&cabin=Y&tripType=OW`,
};

function airlineUrl(code: string, fromIata: string, toIata: string, date: string, adults: number): string {
  const builder = AIRLINE_URLS[code?.toUpperCase()];
  if (builder) return builder(fromIata, toIata, date, adults);
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

// Scrape one leg using an already-open browser instance
async function scrapeLeg(
  browser: Browser,
  fromIata: string,
  toIata: string,
  date: string,
  adults: number
): Promise<FlightOption[]> {
  const url = `https://www.google.com/travel/flights#flt=${fromIata}.${toIata}.${date};c:CLP;e:${adults};sd:1;t:f`;

  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "es-CL,es;q=0.9,en;q=0.8" });
    await page.setViewport({ width: 1440, height: 900 });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Dismiss cookie/consent dialogs if present
    try {
      await page.waitForSelector('button[aria-label*="Aceptar"], button[aria-label*="Accept all"]', { timeout: 3000 });
      const btn = await page.$('button[aria-label*="Aceptar"]') ?? await page.$('button[aria-label*="Accept all"]');
      if (btn) { await btn.click(); await new Promise(r => setTimeout(r, 800)); }
    } catch { /* no dialog */ }

    // Wait for flight results (list items with prices)
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('[role="listitem"]').length > 2,
        { timeout: 18000 }
      );
    } catch { /* take screenshot regardless */ }

    // Let prices finish loading
    await new Promise(r => setTimeout(r, 2500));

    const screenshot = Buffer.from(
      await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1440, height: 900 } })
    );

    // Extract flight data from screenshot with Claude vision
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
            text: `Captura de Google Flights: vuelos ${fromIata}→${toIata} el ${date}, ${adults} persona(s).

Extrae TODOS los vuelos visibles. SOLO JSON:

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
- Extrae hasta 6 vuelos en el orden que aparecen en pantalla
- priceClp: precio TOTAL en CLP para TODOS los pasajeros. Si está en USD multiplica x 920
- departure/arrival: hora local HH:MM
- durationMin: minutos totales incluyendo escalas
- stops: 0=directo, 1+ con escalas
- carrierCode: LA=LATAM, H2=Sky, JA=JetSMART, AR=Aerolíneas Argentinas, G3=Gol, AA=American, UA=United, CM=Copa, AV=Avianca
- Si la página no cargó vuelos retorna {"flights":[]}
- SOLO JSON sin markdown`,
          },
        ],
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text
      .replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    let flights: ScrapedFlight[] = [];
    try {
      flights = (JSON.parse(raw) as { flights: ScrapedFlight[] }).flights ?? [];
    } catch {
      console.error(`[flights] vision parse error for ${fromIata}→${toIata}:`, raw.slice(0, 150));
      return [];
    }

    if (flights.length === 0) return [];

    // Auto pros/cons from relative comparisons
    const prices = flights.map(f => f.priceClp);
    const minP = Math.min(...prices), maxP = Math.max(...prices);

    return flights.map(f => {
      const pros: string[] = [];
      const cons: string[] = [];

      if (f.stops === 0) pros.push("Vuelo directo, sin escalas");
      else cons.push(`${f.stops} escala${f.stops > 1 ? "s" : ""}`);

      if (prices.length > 1) {
        if (f.priceClp <= minP + (maxP - minP) * 0.2) pros.push("El más económico");
        else if (f.priceClp >= maxP - (maxP - minP) * 0.2) cons.push("El más caro");
      }

      const depH = parseInt((f.departure ?? "12").split(":")[0]);
      if (depH >= 6 && depH <= 9) pros.push("Sale temprano — llegas con el día completo");
      else if (depH >= 20 || depH < 5) pros.push("Vuelo nocturno — no pierdes días de viaje");
      else if (depH >= 13 && depH <= 17) cons.push("Sale al mediodía, llegas en la tarde");

      if (f.durationMin > 0 && f.durationMin <= 100) pros.push(`Vuelo corto (${Math.floor(f.durationMin / 60)}h${f.durationMin % 60 ? f.durationMin % 60 + "m" : ""})`);

      if (pros.length === 0) pros.push("Aerolínea con trayectoria en la ruta");
      if (cons.length === 0) cons.push("Verifica si incluye equipaje de bodega");

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
        bookingSearchUrl: airlineUrl(f.carrierCode ?? "", fromIata, toIata, date, adults),
      } satisfies FlightOption;
    });
  } finally {
    await page.close();
  }
}

export async function POST(req: NextRequest) {
  const { legs, adults } = await req.json() as { legs: FlightLeg[]; adults: number };

  // Launch ONE browser instance, reuse across all legs
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

  const flightOptions: Record<string, FlightOption[]> = {};

  try {
    // Process each leg sequentially (same browser, new tab per leg)
    for (const leg of legs) {
      const key = `${leg.fromCity}-${leg.toCity}`;
      if (!leg.fromIata || !leg.toIata || !leg.date) {
        flightOptions[key] = [];
        continue;
      }
      try {
        console.log(`[flights] scraping ${key} (${leg.fromIata}→${leg.toIata} ${leg.date})`);
        flightOptions[key] = await scrapeLeg(browser, leg.fromIata, leg.toIata, leg.date, adults);
        console.log(`[flights] ${key}: ${flightOptions[key].length} options found`);
      } catch (e) {
        console.error(`[flights] ${key} failed:`, e instanceof Error ? e.message : e);
        flightOptions[key] = [];
      }
    }
  } finally {
    await browser.close();
  }

  return NextResponse.json({ flightOptions });
}
