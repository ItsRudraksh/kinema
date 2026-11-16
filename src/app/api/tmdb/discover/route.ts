import { NextRequest, NextResponse } from "next/server";
import { discoverSurpriseNodes } from "@/lib/tmdb";
import type { TmdbRawMediaType } from "@/lib/types";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category") || undefined;
  const maxRuntime = sp.get("maxRuntime")
    ? Number(sp.get("maxRuntime"))
    : undefined;
  const seedType =
    sp.get("seedType") === "movie" || sp.get("seedType") === "tv"
      ? (sp.get("seedType") as TmdbRawMediaType)
      : undefined;
  const seedId = sp.get("seedId") ? Number(sp.get("seedId")) : undefined;

  const results = await discoverSurpriseNodes({
    category,
    maxRuntime,
    seedType,
    seedId,
  });
  return NextResponse.json({ results });
}
