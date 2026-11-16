import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { fetchMediaDossier } from "@/lib/tmdb";
import type { TmdbRawMediaType } from "@/lib/types";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ mediaType: string; id: string }> },
) {
  const { mediaType, id } = await context.params;
  if (mediaType !== "movie" && mediaType !== "tv") {
    return NextResponse.json({ error: "Invalid mediaType" }, { status: 400 });
  }
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = await readDb();
  const region = req.nextUrl.searchParams.get("region") || db.region || "IN";
  const dossier = await fetchMediaDossier(
    mediaType as TmdbRawMediaType,
    numId,
    region,
  );

  if (!dossier) {
    return NextResponse.json(
      { error: "TMDB temporarily unreachable" },
      { status: 503 },
    );
  }
  return NextResponse.json({ dossier });
}
