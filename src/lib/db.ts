import fs from "node:fs/promises";
import path from "node:path";
import type { DiaryEntry, OrbisDatabaseSchema } from "./types";

const IS_READONLY_FS = Boolean(process.env.VERCEL);
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "orbis-diary.json");

const DEFAULT_DB: OrbisDatabaseSchema = {
  version: 1,
  region: process.env.TMDB_DEFAULT_REGION || "IN",
  entries: {},
};

let writeQueue: Promise<unknown> = Promise.resolve();

async function ensureDbFile(): Promise<void> {
  if (IS_READONLY_FS) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
  }
}

export async function readDb(): Promise<OrbisDatabaseSchema> {
  if (IS_READONLY_FS) {
    return { ...DEFAULT_DB, entries: {} };
  }
  await ensureDbFile();
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<OrbisDatabaseSchema>;
    return {
      version: 1,
      region: parsed.region || process.env.TMDB_DEFAULT_REGION || "IN",
      entries:
        parsed.entries && typeof parsed.entries === "object"
          ? parsed.entries
          : {},
    };
  } catch {
    return { ...DEFAULT_DB, entries: {} };
  }
}

export function mutateDb<T>(
  mutator: (db: OrbisDatabaseSchema) => T | Promise<T>,
): Promise<T> {
  const next = writeQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    if (!IS_READONLY_FS) {
      const tmpPath = `${DB_FILE}.${Date.now()}.tmp`;
      await fs.writeFile(tmpPath, JSON.stringify(db, null, 2), "utf8");
      await fs.rename(tmpPath, DB_FILE);
    }
    return result;
  });
  writeQueue = next.catch(() => undefined);
  return next;
}

export async function getAllEntries(): Promise<DiaryEntry[]> {
  const db = await readDb();
  return Object.values(db.entries).sort((a, b) =>
    b.loggedAt.localeCompare(a.loggedAt),
  );
}
