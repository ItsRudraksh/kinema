import { NextRequest, NextResponse } from "next/server";
import { getAllEntries, readDb } from "@/lib/db";
import { fetchStarterCosmos } from "@/lib/tmdb";
import type { CosmosNode } from "@/lib/types";

export async function GET(req: NextRequest) {
  const page = Number(req.nextUrl.searchParams.get("page") || "1") || 1;
  const [entries, db] = await Promise.all([getAllEntries(), readDb()]);

  const seeds = entries
    .filter((e) => (e.rating ?? 0) >= 4 || e.favorite)
    .slice(0, 2)
    .map((e) => ({ tmdbType: e.tmdbType, tmdbId: e.tmdbId }));

  const starter = await fetchStarterCosmos(page, seeds);
  const map = new Map<string, CosmosNode>();

  for (const entry of entries) {
    map.set(entry.key, {
      key: entry.key,
      tmdbId: entry.tmdbId,
      tmdbType: entry.tmdbType,
      category: entry.category,
      title: entry.title,
      posterPath: entry.posterPath,
      releaseYear: entry.releaseYear,
      voteAverage: entry.rating ? entry.rating * 2 : 0,
      genres: entry.genres,
      totalEpisodes: entry.totalEpisodes,
      runtimeMinutes: entry.runtimeMinutes,
      diary: entry,
      source: entry.status === "watchlist" ? "watchlist" : "diary",
    });
  }

  for (const item of starter) {
    if (!map.has(item.key)) {
      map.set(item.key, item);
    }
  }

  return NextResponse.json({
    nodes: Array.from(map.values()).slice(0, 144),
    region: db.region,
  });
}
