import { NextRequest, NextResponse } from "next/server";
import { fetchFlightsForLegs, type FlightLeg } from "@/lib/fetchFlights";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { legs, adults } = await req.json() as { legs: FlightLeg[]; adults: number };
  const flightOptions = await fetchFlightsForLegs(legs, adults);
  return NextResponse.json({ flightOptions });
}
