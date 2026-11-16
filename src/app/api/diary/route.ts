import { NextRequest, NextResponse } from "next/server";
import { getAllEntries, mutateDb, readDb } from "@/lib/db";
import type { DiaryEntry, OrbisDatabaseSchema } from "@/lib/types";

export async function GET(req: NextRequest) {
  const exportMode = req.nextUrl.searchParams.get("export") === "1";
  const db = await readDb();
  if (exportMode) {
    return new NextResponse(JSON.stringify(db, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="orbis-backup.json"',
      },
    });
  }
  const entries = await getAllEntries();
  return NextResponse.json({ entries, region: db.region });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    entry?: DiaryEntry;
    importDb?: OrbisDatabaseSchema;
    region?: string;
  };

  if (body.region) {
    const cleanRegion = body.region.trim().toUpperCase().slice(0, 2);
    await mutateDb((db) => {
      db.region = cleanRegion || "IN";
    });
    return NextResponse.json({ region: cleanRegion || "IN" });
  }

  if (body.importDb?.entries && typeof body.importDb.entries === "object") {
    const count = await mutateDb((db) => {
      for (const [k, v] of Object.entries(body.importDb!.entries)) {
        if (v && typeof v.tmdbId === "number" && v.title) {
          db.entries[k] = v;
        }
      }
      return Object.keys(db.entries).length;
    });
    const entries = await getAllEntries();
    return NextResponse.json({ entries, count });
  }

  if (!body.entry?.key || !body.entry.tmdbId) {
    return NextResponse.json(
      { error: "Invalid entry payload" },
      { status: 400 },
    );
  }

  const saved = await mutateDb((db) => {
    const incoming = {
      ...body.entry!,
      loggedAt: body.entry!.loggedAt || new Date().toISOString(),
    };
    db.entries[incoming.key] = incoming;
    return incoming;
  });

  return NextResponse.json({ entry: saved });
}

export async function DELETE(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }
  const removed = await mutateDb((db) => {
    const prev = db.entries[key] ?? null;
    delete db.entries[key];
    return prev;
  });
  return NextResponse.json({ removed });
}
