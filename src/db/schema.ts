import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { DiaryEntry } from "@/lib/types";

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey().notNull(),
  region: text("region").notNull().default("IN"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const diaryEntries = pgTable(
  "diary_entries",
  {
    // Composite key: `${userId}:${entry.key}` (e.g. "user_2abc:movie-157336")
    id: text("id").primaryKey().notNull(),
    userId: text("user_id").notNull(),
    entryKey: text("entry_key").notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    tmdbType: text("tmdb_type").notNull(),
    category: text("category").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull(),
    rating: real("rating"),
    favorite: boolean("favorite").notNull().default(false),
    loggedAt: text("logged_at").notNull(),
    payload: jsonb("payload").$type<DiaryEntry>().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("diary_user_id_idx").on(table.userId)],
);
