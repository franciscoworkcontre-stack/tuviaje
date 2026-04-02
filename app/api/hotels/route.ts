import { NextRequest, NextResponse } from "next/server";
import { fetchHotelsForCities } from "@/lib/fetchHotels";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { cities, travelStyle, checkIn, checkOut, adults = 2 } =
    await req.json() as { cities: string[]; travelStyle: string; checkIn?: string; checkOut?: string; adults?: number };

  const today = new Date();
  const defaultCheckIn = new Date(today.getTime() + 90 * 86400000).toISOString().slice(0, 10);
  const defaultCheckOut = new Date(today.getTime() + 93 * 86400000).toISOString().slice(0, 10);

  const hotelRecommendations = await fetchHotelsForCities(
    cities,
    travelStyle,
    checkIn ?? defaultCheckIn,
    checkOut ?? defaultCheckOut,
    adults
  );

  return NextResponse.json({ hotelRecommendations });
}
