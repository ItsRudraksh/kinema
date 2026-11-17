import fs from "node:fs/promises";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, userSettings } from "@/db/schema";
import type { DiaryEntry, OrbisDatabaseSchema } from "./types";

const IS_READONLY_FS = Boolean(process.env.VERCEL);
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "orbis-diary.json");

const DEFAULT_REGION = process.env.TMDB_DEFAULT_REGION || "IN";

/**
 * Reads local `data/orbis-diary.json` on your PC so existing entries
 * can be automatically migrated to your Clerk + Neon account on sign-in.
 */
export async function readLocalFileEntries(): Promise<{
  entries: DiaryEntry[];
  region: string;
}> {
  if (IS_READONLY_FS) {
    return { entries: [], region: DEFAULT_REGION };
  }
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<OrbisDatabaseSchema>;
    const entries =
      parsed.entries && typeof parsed.entries === "object"
        ? Object.values(parsed.entries).sort((a, b) =>
            b.loggedAt.localeCompare(a.loggedAt),
          )
        : [];
    return {
      entries,
      region: parsed.region || DEFAULT_REGION,
    };
  } catch {
    return { entries: [], region: DEFAULT_REGION };
  }
}

export async function getUserRegion(userId?: string | null): Promise<string> {
  if (userId && db) {
    try {
      const rows = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);
      if (rows[0]?.region) return rows[0].region;
    } catch {
      // fall through
    }
  }
  const local = await readLocalFileEntries();
  return local.region;
}

export async function setUserRegion(
  userId: string,
  region: string,
): Promise<void> {
  if (!db) return;
  const clean = region.trim().toUpperCase().slice(0, 2) || DEFAULT_REGION;
  await db
    .insert(userSettings)
    .values({ userId, region: clean, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { region: clean, updatedAt: new Date() },
    });
}

export async function getAllEntries(
  userId?: string | null,
): Promise<DiaryEntry[]> {
  if (userId && db) {
    try {
      const rows = await db
        .select()
        .from(diaryEntries)
        .where(eq(diaryEntries.userId, userId))
        .orderBy(desc(diaryEntries.loggedAt));

      // Auto-migrate local PC `data/orbis-diary.json` into Neon on very first login!
      if (rows.length === 0 && !IS_READONLY_FS) {
        const local = await readLocalFileEntries();
        if (local.entries.length > 0) {
          await upsertManyEntries(userId, local.entries);
          return local.entries;
        }
      }

      return rows.map((r) => r.payload);
    } catch {
      // fall back if DB unreachable
    }
  }
  const local = await readLocalFileEntries();
  return local.entries;
}

export async function readDb(
  userId?: string | null,
): Promise<OrbisDatabaseSchema> {
  const [entries, region] = await Promise.all([
    getAllEntries(userId),
    getUserRegion(userId),
  ]);
  const map: Record<string, DiaryEntry> = {};
  for (const e of entries) map[e.key] = e;
  return { version: 1, region, entries: map };
}

export async function upsertSingleEntry(
  userId: string,
  entry: DiaryEntry,
): Promise<DiaryEntry> {
  const normalized: DiaryEntry = {
    ...entry,
    loggedAt: entry.loggedAt || new Date().toISOString(),
  };
  if (db) {
    const rowId = `${userId}:${normalized.key}`;
    await db
      .insert(diaryEntries)
      .values({
        id: rowId,
        userId,
        entryKey: normalized.key,
        tmdbId: normalized.tmdbId,
        tmdbType: normalized.tmdbType,
        category: normalized.category,
        title: normalized.title,
        status: normalized.status,
        rating: normalized.rating,
        favorite: normalized.favorite,
        loggedAt: normalized.loggedAt,
        payload: normalized,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: diaryEntries.id,
        set: {
          title: normalized.title,
          status: normalized.status,
          rating: normalized.rating,
          favorite: normalized.favorite,
          loggedAt: normalized.loggedAt,
          payload: normalized,
          updatedAt: new Date(),
        },
      });
  }
  return normalized;
}

export async function upsertManyEntries(
  userId: string,
  entries: DiaryEntry[],
): Promise<number> {
  if (!db || entries.length === 0) return 0;
  let count = 0;
  for (const item of entries) {
    if (item && typeof item.tmdbId === "number" && item.key && item.title) {
      await upsertSingleEntry(userId, item);
      count++;
    }
  }
  return count;
}

export async function removeUserEntry(
  userId: string,
  entryKey: string,
): Promise<void> {
  if (!db) return;
  await db
    .delete(diaryEntries)
    .where(
      and(eq(diaryEntries.userId, userId), eq(diaryEntries.entryKey, entryKey)),
    );
}
