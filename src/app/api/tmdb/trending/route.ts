import { NextResponse } from "next/server";
import { fetchDailyTrending } from "@/lib/tmdb";

export async function GET() {
  const trending = await fetchDailyTrending();
  return NextResponse.json({ trending });
}
