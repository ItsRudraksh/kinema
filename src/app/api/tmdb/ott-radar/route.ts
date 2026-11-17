import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAllEntries, getUserRegion } from "@/lib/db";
import { checkWatchlistOttRadar } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const [entries, savedRegion] = await Promise.all([
    getAllEntries(userId),
    getUserRegion(userId),
  ]);
  const region = req.nextUrl.searchParams.get("region") || savedRegion || "IN";
  const items = await checkWatchlistOttRadar(entries, region);
  return NextResponse.json({ items, region });
}
