import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getAllEntries,
  getUserRegion,
  readDb,
  removeUserEntry,
  setUserRegion,
  upsertManyEntries,
  upsertSingleEntry,
} from "@/lib/db";
import type { DiaryEntry, OrbisDatabaseSchema } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const exportMode = req.nextUrl.searchParams.get("export") === "1";

  if (exportMode) {
    const dbSnap = await readDb(userId);
    return new NextResponse(JSON.stringify(dbSnap, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="kinema-backup.json"',
      },
    });
  }

  const [entries, region] = await Promise.all([
    getAllEntries(userId),
    getUserRegion(userId),
  ]);
  return NextResponse.json({ entries, region, signedIn: Boolean(userId) });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to sync across devices" },
      { status: 401 },
    );
  }

  const body = (await req.json()) as {
    entry?: DiaryEntry;
    bulkEntries?: DiaryEntry[];
    importDb?: OrbisDatabaseSchema;
    region?: string;
  };

  if (body.region) {
    await setUserRegion(userId, body.region);
    return NextResponse.json({ region: body.region.toUpperCase() });
  }

  if (Array.isArray(body.bulkEntries) && body.bulkEntries.length > 0) {
    const count = await upsertManyEntries(userId, body.bulkEntries);
    const entries = await getAllEntries(userId);
    return NextResponse.json({ entries, count });
  }

  if (body.importDb?.entries && typeof body.importDb.entries === "object") {
    const list = Object.values(body.importDb.entries);
    const count = await upsertManyEntries(userId, list);
    const entries = await getAllEntries(userId);
    return NextResponse.json({ entries, count });
  }

  if (!body.entry?.key || !body.entry.tmdbId) {
    return NextResponse.json(
      { error: "Invalid entry payload" },
      { status: 400 },
    );
  }

  const saved = await upsertSingleEntry(userId, body.entry);
  return NextResponse.json({ entry: saved });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }
  await removeUserEntry(userId, key);
  return NextResponse.json({ ok: true });
}
