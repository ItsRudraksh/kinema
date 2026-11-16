import { NextRequest, NextResponse } from "next/server";
import { getAllEntries, readDb } from "@/lib/db";
import { checkWatchlistOttRadar } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const [entries, db] = await Promise.all([getAllEntries(), readDb()]);
  const region = req.nextUrl.searchParams.get("region") || db.region || "IN";
  const items = await checkWatchlistOttRadar(entries, region);
  return NextResponse.json({ items, region });
}
