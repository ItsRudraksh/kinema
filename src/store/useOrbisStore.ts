"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { fetchJsonWithRetry } from "@/lib/fetchWithRetry";
import type {
  CosmosNode,
  DiaryEntry,
  MediaCategory,
  OttRadarItem,
} from "@/lib/types";

export type GlobeLens = "all" | MediaCategory | "watchlist";
export type RandomizerTab = "spin" | "roulette" | "ticket" | "compass";

export interface DossierTarget {
  tmdbType: "movie" | "tv";
  tmdbId: number;
  seedNode?: {
    title: string;
    category: MediaCategory;
    posterPath: string | null;
    releaseYear: string;
    voteAverage?: number;
  };
}

interface OrbisState {
  entries: DiaryEntry[];
  cosmosNodes: CosmosNode[];
  cosmosPage: number;
  region: string;
  lens: GlobeLens;
  isExplored: boolean;
  focusedNode: CosmosNode | null;
  dossierTarget: DossierTarget | null;
  personTargetId: number | null;
  ottRadarOpen: boolean;
  ottItems: OttRadarItem[];
  ottLoading: boolean;
  commandOpen: boolean;
  randomizerOpen: boolean;
  randomizerTab: RandomizerTab;
  spinTriggerCount: number;
  spinCategoryFilter: MediaCategory | "all";
  spinIncludeRewatches: boolean;
  spinWinnerNode: CosmosNode | null;
  loadingCosmos: boolean;

  hydrate: (data: {
    entries: DiaryEntry[];
    cosmosNodes: CosmosNode[];
    region: string;
    replace?: boolean;
  }) => void;
  setLens: (lens: GlobeLens) => void;
  setExplored: (explored: boolean) => void;
  setFocusedNode: (node: CosmosNode | null) => void;
  setSpinWinnerNode: (node: CosmosNode | null) => void;
  openDossier: (
    tmdbType: "movie" | "tv",
    tmdbId: number,
    seedNode?: DossierTarget["seedNode"],
  ) => void;
  closeDossier: () => void;
  openPerson: (personId: number) => void;
  closePerson: () => void;
  setOttRadarOpen: (open: boolean) => void;
  fetchOttRadar: () => Promise<void>;
  setCommandOpen: (open: boolean) => void;
  openRandomizer: (tab?: RandomizerTab) => void;
  closeRandomizer: () => void;
  triggerGlobeSpin: (
    category: MediaCategory | "all",
    includeRewatches: boolean,
  ) => void;
  saveEntry: (entry: DiaryEntry, silent?: boolean) => Promise<void>;
  deleteEntry: (key: string) => Promise<void>;
  stepEpisode: (entry: DiaryEntry, delta: number) => Promise<void>;
  updateRegion: (region: string) => Promise<void>;
  shuffleCosmos: () => Promise<void>;
}

function mergeEntriesByTimestamp(
  localEntries: DiaryEntry[],
  serverEntries: DiaryEntry[],
): DiaryEntry[] {
  const merged = new Map<string, DiaryEntry>();
  for (const e of serverEntries) merged.set(e.key, e);
  for (const e of localEntries) {
    const existing = merged.get(e.key);
    if (!existing || e.loggedAt >= existing.loggedAt) {
      merged.set(e.key, e);
    }
  }
  return Array.from(merged.values()).sort((a, b) =>
    b.loggedAt.localeCompare(a.loggedAt),
  );
}

function mergeCosmosWithEntries(
  nodes: CosmosNode[],
  entries: DiaryEntry[],
): CosmosNode[] {
  const byKey = new Map(entries.map((e) => [e.key, e]));
  const result = new Map<string, CosmosNode>();

  for (const entry of entries) {
    result.set(entry.key, {
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

  for (const n of nodes) {
    if (!result.has(n.key)) {
      result.set(n.key, { ...n, diary: undefined, source: "starter" });
    }
  }
  return Array.from(result.values()).slice(0, 144);
}

export const useOrbisStore = create<OrbisState>()(
  persist(
    (set, get) => ({
      entries: [],
      cosmosNodes: [],
      cosmosPage: 1,
      region: "IN",
      lens: "all",
      isExplored: false,
      focusedNode: null,
      dossierTarget: null,
      personTargetId: null,
      ottRadarOpen: false,
      ottItems: [],
      ottLoading: false,
      commandOpen: false,
      randomizerOpen: false,
      randomizerTab: "spin",
      spinTriggerCount: 0,
      spinCategoryFilter: "all",
      spinIncludeRewatches: false,
      spinWinnerNode: null,
      loadingCosmos: false,

      hydrate: ({ entries: serverEntries, cosmosNodes, region, replace }) => {
        const shouldReplace = replace ?? serverEntries.length > 0;
        const nextEntries = shouldReplace
          ? serverEntries
          : mergeEntriesByTimestamp(get().entries, serverEntries);
        const watchlistKeys = new Set(
          nextEntries.filter((e) => e.status === "watchlist").map((e) => e.key),
        );
        set((s) => ({
          entries: nextEntries,
          cosmosNodes: mergeCosmosWithEntries(cosmosNodes, nextEntries),
          ottItems: s.ottItems.filter((i) => watchlistKeys.has(i.entry.key)),
          region: region || get().region || "IN",
        }));
      },

      setLens: (lens) => set({ lens }),
      setExplored: (isExplored) => set({ isExplored, focusedNode: null }),
      setFocusedNode: (focusedNode) => set({ focusedNode }),
      setSpinWinnerNode: (spinWinnerNode) => set({ spinWinnerNode }),

      openDossier: (tmdbType, tmdbId, seedNode) =>
        set({
          dossierTarget: { tmdbType, tmdbId, seedNode },
          commandOpen: false,
        }),
      closeDossier: () => set({ dossierTarget: null }),

      openPerson: (personId) =>
        set({
          personTargetId: personId,
          commandOpen: false,
          dossierTarget: null,
        }),
      closePerson: () => set({ personTargetId: null }),

      setOttRadarOpen: (ottRadarOpen) => set({ ottRadarOpen }),

      fetchOttRadar: async () => {
        const region = get().region;
        const watchlistKeys = new Set(
          get()
            .entries.filter((e) => e.status === "watchlist")
            .map((e) => e.key),
        );
        if (watchlistKeys.size === 0) {
          set({ ottItems: [], ottLoading: false });
          return;
        }
        set({ ottLoading: true });
        try {
          const data = await fetchJsonWithRetry<{ items: OttRadarItem[] }>(
            `/api/tmdb/ott-radar?region=${region}`,
          );
          // Re-verify against current client watchlist so race conditions never show completed films
          const latestWatchlistKeys = new Set(
            get()
              .entries.filter((e) => e.status === "watchlist")
              .map((e) => e.key),
          );
          set({
            ottItems: (data.items ?? []).filter((i) =>
              latestWatchlistKeys.has(i.entry.key),
            ),
          });
        } catch {
          // silent if offline
        } finally {
          set({ ottLoading: false });
        }
      },

      setCommandOpen: (commandOpen) => set({ commandOpen }),
      openRandomizer: (tab = "spin") =>
        set({ randomizerOpen: true, randomizerTab: tab, commandOpen: false }),
      closeRandomizer: () => set({ randomizerOpen: false }),

      triggerGlobeSpin: (category, includeRewatches) =>
        set((s) => ({
          randomizerOpen: false,
          isExplored: false,
          spinWinnerNode: null,
          focusedNode: null,
          lens:
            category === "all"
              ? includeRewatches
                ? "all"
                : "watchlist"
              : category,
          spinCategoryFilter: category,
          spinIncludeRewatches: includeRewatches,
          spinTriggerCount: s.spinTriggerCount + 1,
        })),

      saveEntry: async (entry, silent = false) => {
        const prevEntries = get().entries;
        const prevExisting = prevEntries.find((e) => e.key === entry.key);
        const updated = [
          entry,
          ...prevEntries.filter((e) => e.key !== entry.key),
        ];

        set((s) => {
          const nextNodes = mergeCosmosWithEntries(s.cosmosNodes, updated);
          // Immediately remove from ottItems if no longer on Watchlist!
          const nextOttItems =
            entry.status === "watchlist"
              ? s.ottItems.map((item) =>
                  item.entry.key === entry.key ? { ...item, entry } : item,
                )
              : s.ottItems.filter((item) => item.entry.key !== entry.key);

          const nextFocused =
            s.focusedNode?.key === entry.key
              ? (nextNodes.find((n) => n.key === entry.key) ?? s.focusedNode)
              : s.focusedNode;

          return {
            entries: updated,
            cosmosNodes: nextNodes,
            ottItems: nextOttItems,
            focusedNode: nextFocused,
          };
        });

        try {
          await fetch("/api/diary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entry }),
          });
          // If newly added to watchlist, scan OTT Radar in background
          if (
            entry.status === "watchlist" &&
            prevExisting?.status !== "watchlist"
          ) {
            void get().fetchOttRadar();
          }
        } catch {
          // offline fallback
        }

        if (!silent) {
          toast.success(`Logged "${entry.title}"`, {
            description:
              entry.status === "watchlist"
                ? "Added to your Unwatched Cosmos"
                : `${entry.status.replace("_", " ")} · ${entry.watchedDate}`,
            action: prevExisting
              ? {
                  label: "Undo",
                  onClick: () => {
                    void get().saveEntry(prevExisting, true);
                  },
                }
              : {
                  label: "Undo",
                  onClick: () => {
                    void get().deleteEntry(entry.key);
                  },
                },
          });
        }
      },

      deleteEntry: async (key) => {
        const prevEntries = get().entries;
        const removed = prevEntries.find((e) => e.key === key);
        const next = prevEntries.filter((e) => e.key !== key);

        set((s) => {
          const nextNodes = mergeCosmosWithEntries(s.cosmosNodes, next);
          return {
            entries: next,
            cosmosNodes: nextNodes,
            ottItems: s.ottItems.filter((item) => item.entry.key !== key),
            focusedNode:
              s.focusedNode?.key === key
                ? { ...s.focusedNode, diary: undefined }
                : s.focusedNode,
          };
        });

        void fetch(`/api/diary?key=${encodeURIComponent(key)}`, {
          method: "DELETE",
        }).catch(() => {});

        if (removed) {
          toast(`Removed "${removed.title}"`, {
            action: {
              label: "Undo",
              onClick: () => {
                void get().saveEntry(removed, true);
              },
            },
          });
        }
      },

      stepEpisode: async (entry, delta) => {
        const maxEp = entry.totalEpisodes ?? 9999;
        const nextEp = Math.max(
          0,
          Math.min(maxEp, entry.watchedEpisodes + delta),
        );
        const finished = entry.totalEpisodes && nextEp >= entry.totalEpisodes;
        const nextEntry: DiaryEntry = {
          ...entry,
          watchedEpisodes: nextEp,
          status: finished ? "completed" : "watching",
          loggedAt: new Date().toISOString(),
        };
        await get().saveEntry(nextEntry, true);
        toast.success(
          finished
            ? `Finished "${entry.title}"!`
            : `${entry.title} · Episode ${nextEp}${entry.totalEpisodes ? ` / ${entry.totalEpisodes}` : ""}`,
          {
            action: {
              label: "Undo",
              onClick: () => {
                void get().saveEntry(entry, true);
              },
            },
          },
        );
      },

      updateRegion: async (region) => {
        const clean = region.toUpperCase();
        set({ region: clean });
        void fetch("/api/diary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ region: clean }),
        }).catch(() => {});
        toast.success(`Streaming region set to ${clean}`);
        void get().fetchOttRadar();
      },

      shuffleCosmos: async () => {
        const nextPage = (get().cosmosPage % 5) + 1;
        set({ loadingCosmos: true, cosmosPage: nextPage });
        try {
          const data = await fetchJsonWithRetry<{ nodes: CosmosNode[] }>(
            `/api/tmdb/cosmos?page=${nextPage}`,
          );
          set((s) => ({
            cosmosNodes: mergeCosmosWithEntries(data.nodes, s.entries),
          }));
          toast.success("Refreshed orbital discoveries");
        } catch {
          toast.error("Could not refresh cosmos right now");
        } finally {
          set({ loadingCosmos: false });
        }
      },
    }),
    {
      name: "kinema-archive-v1",
      partialize: (state) => ({
        entries: state.entries,
        region: state.region,
      }),
    },
  ),
);
