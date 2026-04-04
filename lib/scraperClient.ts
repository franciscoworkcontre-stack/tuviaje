/**
 * Client for google-travel-scraper API.
 * Handles the async job pattern: POST → job_id → poll until done.
 */

// Allowlist-only validation for SCRAPER_URL — prevents SSRF if env var is tampered
const SCRAPER_ALLOWED_HOSTS = ["google-travel-scraper.vercel.app"];
function resolveScraperUrl(): string {
  const configured = process.env.SCRAPER_API_URL;
  if (configured) {
    try {
      const { hostname, protocol } = new URL(configured);
      if (protocol === "https:" && SCRAPER_ALLOWED_HOSTS.some(h => hostname === h)) {
        return configured.replace(/\/$/, "");
      }
    } catch { /* invalid URL — fall through to default */ }
  }
  return "https://google-travel-scraper.vercel.app";
}
const SCRAPER_URL = resolveScraperUrl();
const SCRAPER_KEY = process.env.SCRAPER_API_KEY ?? "";

const HEADERS = {
  "Content-Type": "application/json",
  "X-API-Key": SCRAPER_KEY,
};

// ── Raw scraper types ─────────────────────────────────────────────────────────

export interface ScraperFlight {
  airline:          string;
  flight_number:    string;
  departure_time:   string; // "HH:MM"
  arrival_time:     string;
  duration_minutes: number;
  stops:            number;
  price_usd:        number;
  cabin:            string;
  scraped_at:       string;
}

export interface ScraperHotel {
  name:             string;
  price_per_night:  number;  // in currency below
  currency:         string;  // "USD" on US servers
  rating:           number;  // 0–5 scale
  review_count:     number | null;
  scraped_at:       string;
}

// ── Polling helper ────────────────────────────────────────────────────────────

async function pollJob<T>(
  jobId: string,
  maxWaitMs = 20_000,
  intervalMs = 700,
): Promise<T> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, intervalMs));
    const res = await fetch(`${SCRAPER_URL}/jobs/${jobId}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`Job poll failed: ${res.status}`);
    const data = await res.json() as { status: string; error?: string } & Record<string, unknown>;
    if (data.status === "done")   return data as T;
    if (data.status === "failed") throw new Error(data.error ?? "Scraper job failed");
  }
  throw new Error("Scraper job timed out");
}

// ── Flights ───────────────────────────────────────────────────────────────────

export async function fetchScraperFlights(
  origin:      string,
  destination: string,
  date:        string,
  passengers:  number = 1,
  cabin:       string = "economy",
): Promise<ScraperFlight[]> {
  if (!SCRAPER_KEY) return [];

  const res = await fetch(`${SCRAPER_URL}/flights`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ origin, destination, date, passengers, cabin }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];

  const data = await res.json() as {
    status: string;
    source?: string;
    job_id?: string;
    flights?: ScraperFlight[];
  };

  // Cache hit — results immediately
  if (data.status === "done" && data.flights) return data.flights;

  // Async job — poll for result
  if (data.status === "queued" && data.job_id) {
    try {
      const job = await pollJob<{ flights?: ScraperFlight[] }>(data.job_id);
      return job.flights ?? [];
    } catch {
      return [];
    }
  }

  return [];
}

// ── Hotels ────────────────────────────────────────────────────────────────────

export async function fetchScraperHotels(
  destination: string,
  checkIn:     string,
  checkOut:    string,
  adults:      number = 2,
): Promise<ScraperHotel[]> {
  if (!SCRAPER_KEY) return [];

  const res = await fetch(`${SCRAPER_URL}/hotels`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ destination, check_in: checkIn, check_out: checkOut, adults }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];

  const data = await res.json() as {
    status: string;
    source?: string;
    job_id?: string;
    hotels?: ScraperHotel[];
  };

  if (data.status === "done" && data.hotels) return data.hotels;

  if (data.status === "queued" && data.job_id) {
    try {
      const job = await pollJob<{ hotels?: ScraperHotel[] }>(data.job_id);
      return job.hotels ?? [];
    } catch {
      return [];
    }
  }

  return [];
}
