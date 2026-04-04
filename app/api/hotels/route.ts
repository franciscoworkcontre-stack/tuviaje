import { NextRequest, NextResponse } from "next/server";
import { fetchHotelsForCities } from "@/lib/fetchHotels";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STYLES = new Set(["mochilero", "comfort", "premium"]);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cities, travelStyle, checkIn, checkOut, adults } = body ?? {};

  if (!Array.isArray(cities) || cities.length === 0 || cities.length > 10) {
    return NextResponse.json({ error: "cities debe ser un array de 1 a 10 elementos" }, { status: 400 });
  }
  const safeStyle = VALID_STYLES.has(travelStyle) ? travelStyle : "comfort";
  const safeAdults = Math.min(Math.max(Number.isInteger(adults) ? adults : 2, 1), 20);

  const today = new Date();
  const defaultCheckIn  = new Date(today.getTime() + 90 * 86400000).toISOString().slice(0, 10);
  const defaultCheckOut = new Date(today.getTime() + 93 * 86400000).toISOString().slice(0, 10);

  // Validate date format — fall back to defaults if malformed
  const safeCheckIn  = (typeof checkIn  === "string" && ISO_DATE.test(checkIn))  ? checkIn  : defaultCheckIn;
  const safeCheckOut = (typeof checkOut === "string" && ISO_DATE.test(checkOut)) ? checkOut : defaultCheckOut;

  const hotelRecommendations = await fetchHotelsForCities(
    cities.slice(0, 10).map((c: unknown) => String(c).slice(0, 100)),
    safeStyle,
    safeCheckIn,
    safeCheckOut,
    safeAdults,
  );

  return NextResponse.json({ hotelRecommendations });
}
