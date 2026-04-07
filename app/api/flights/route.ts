import { NextRequest, NextResponse } from "next/server";
import { fetchFlightsForLegs, type FlightLeg } from "@/lib/fetchFlights";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { legs, adults, children, infants, travelStyle } = body ?? {};

  if (!Array.isArray(legs) || legs.length === 0 || legs.length > 10) {
    return NextResponse.json({ error: "legs debe ser un array de 1 a 10 elementos" }, { status: 400 });
  }
  const safeAdults   = Math.min(Math.max(Number.isInteger(adults)   ? adults   : 1, 1), 20);
  const safeChildren = Math.min(Math.max(Number.isInteger(children) ? children : 0, 0), 10);
  const safeInfants  = Math.min(Math.max(Number.isInteger(infants)  ? infants  : 0, 0), 4);

  const flightOptions = await fetchFlightsForLegs(legs as FlightLeg[], safeAdults, travelStyle ?? "comfort", safeChildren, safeInfants);
  return NextResponse.json({ flightOptions });
}
