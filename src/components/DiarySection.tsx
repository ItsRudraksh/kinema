"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "motion/react";
import NumberFlow from "@number-flow/react";
import { Virtuoso } from "react-virtuoso";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";
import { Popover } from "@base-ui/react/popover";
import { OrbisSelect } from "./ui/OrbisControls";
import {
  Award,
  BarChart3,
  Download,
  Eye,
  Film,
  Flame,
  Layers,
  List,
  Plus,
  Radio,
  Search,
  Settings,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useOrbisStore } from "@/store/useOrbisStore";
import { formatCategoryLabel, formatCount } from "@/lib/classify";
import { fetchJsonWithRetry } from "@/lib/fetchWithRetry";
import { PosterImage } from "./PosterImage";
import type { CosmosNode, DiaryEntry, MediaCategory } from "@/lib/types";

type DiaryView = "timeline" | "closet" | "analytics";

export function DiarySection() {
  const {
    entries,
    cosmosNodes,
    openDossier,
    openPerson,
    stepEpisode,
    setCommandOpen,
    openRandomizer,
    region,
    updateRegion,
    hydrate,
    ottItems,
    setOttRadarOpen,
  } = useOrbisStore();

  const [view, setView] = useState<DiaryView>("timeline");
  const [categoryFilter, setCategoryFilter] = useState<MediaCategory | "all">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [unblurredSpoilers, setUnblurredSpoilers] = useState<Set<string>>(
    new Set(),
  );
  const [trendingDaily, setTrendingDaily] = useState<CosmosNode[]>([]);
  const [ottBannerDismissed, setOttBannerDismissed] = useState(false);

  useEffect(() => {
    fetchJsonWithRetry<{ trending: CosmosNode[] }>("/api/tmdb/trending")
      .then((d) => setTrendingDaily(d.trending ?? []))
      .catch(() => {});
  }, []);

  const reduceMotion = useReducedMotion();
  const stripRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: stripProgress } = useScroll({
    target: stripRef,
    offset: ["start end", "end start"],
  });
  const stripX = useTransform(stripProgress, [0, 1], [-18, 18]);

  const watchingList = useMemo(
    () => entries.filter((e) => e.status === "watching"),
    [entries],
  );

  const fourFavorites = useMemo(() => {
    return entries
      .filter((e) => e.fourFavoriteSlot !== null)
      .sort((a, b) => (a.fourFavoriteSlot ?? 9) - (b.fourFavoriteSlot ?? 9))
      .slice(0, 4);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter)
        return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      return true;
    });
  }, [entries, categoryFilter, statusFilter]);

  const closetEntries = useMemo(
    () => entries.filter((e) => (e.rating ?? 0) >= 4.5 || e.favorite),
    [entries],
  );

  // Live cross-check against `entries` so completing a Watchlist film removes it from the OTT banner in 0ms!
  const ottNewReleases = useMemo(() => {
    const activeWatchlistKeys = new Set(
      entries.filter((e) => e.status === "watchlist").map((e) => e.key),
    );
    return ottItems.filter(
      (i) => activeWatchlistKeys.has(i.entry.key) && i.flatrate.length > 0,
    );
  }, [ottItems, entries]);

  const stats = useMemo(() => {
    const completed = entries.filter((e) => e.status === "completed");
    const totalHours = Math.round(
      entries.reduce((acc, e) => {
        const mins = e.runtimeMinutes ?? (e.tmdbType === "tv" ? 45 : 110);
        const count =
          e.tmdbType === "tv"
            ? Math.max(e.watchedEpisodes, 0)
            : e.status === "completed"
              ? 1
              : 0;
        return acc + mins * count;
      }, 0) / 60,
    );

    const byCategory = (
      ["film", "series", "anime", "drama", "doc"] as MediaCategory[]
    ).map((cat) => ({
      name: formatCategoryLabel(cat),
      count: entries.filter((e) => e.category === cat).length,
    }));

    const personCounter = new Map<
      number,
      { id: number; name: string; role: string; count: number }
    >();
    for (const e of entries) {
      for (const p of e.peopleSnapshot ?? []) {
        const cur = personCounter.get(p.id);
        if (cur) cur.count += 1;
        else personCounter.set(p.id, { ...p, count: 1 });
      }
    }
    const topPeople = Array.from(personCounter.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      totalLogged: entries.length,
      completedCount: completed.length,
      watchlistCount: entries.filter((e) => e.status === "watchlist").length,
      totalHours,
      byCategory,
      topPeople,
    };
  }, [entries]);

  const toggleSpoiler = (key: string) => {
    setUnblurredSpoilers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  async function handleImportJson(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importDb: parsed }),
      });
      const data = (await res.json()) as {
        entries?: DiaryEntry[];
        count?: number;
      };
      if (data.entries) {
        hydrate({ entries: data.entries, cosmosNodes, region, replace: true });
        toast.success(`Imported ${data.count ?? data.entries.length} entries`);
      }
    } catch {
      toast.error("Invalid KINEMA backup JSON");
    }
  }

  return (
    <section
      id="diary"
      className="relative z-10 mx-auto max-w-6xl px-4 sm:px-8 pt-10 pb-24 sm:py-20 space-y-14 sm:space-y-16"
    >
      {/* Watchlist OTT Release Alert Banner */}
      {ottNewReleases.length > 0 && !ottBannerDismissed && (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3.5 sm:p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="size-8 rounded-full bg-emerald-400/15 border border-emerald-400/35 flex items-center justify-center shrink-0">
              <Radio className="size-4 text-emerald-400" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-300">
                Watchlist OTT Radar · {region}
              </p>
              <p className="text-xs sm:text-sm text-white truncate">
                {formatCount(
                  ottNewReleases.length,
                  "watchlist title is",
                  "watchlist titles are",
                )}{" "}
                streaming:{" "}
                <span className="text-emerald-200 font-medium">
                  {ottNewReleases
                    .slice(0, 3)
                    .map((i) => i.entry.title)
                    .join(", ")}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setOttRadarOpen(true)}
              className="orbis-press rounded-full bg-emerald-400 text-black px-3 py-1.5 text-xs font-semibold"
            >
              Inspect
            </button>
            <button
              onClick={() => setOttBannerDismissed(true)}
              aria-label="Dismiss OTT banner"
              className="orbis-press rounded-full p-1.5 text-zinc-400 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Today's Top 10 Daily Trending Pulse */}
      {trendingDaily.length > 0 && (
        <div className="space-y-3.5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                <Flame className="size-3.5 text-amber-400" />
                Daily Global Pulse
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-white">
                Trending Today
              </h2>
            </div>
            <span className="font-mono text-[11px] text-zinc-500">
              TOP {trendingDaily.length}
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {trendingDaily.map((item, idx) => (
              <button
                key={item.key}
                onClick={() =>
                  openDossier(item.tmdbType, item.tmdbId, {
                    title: item.title,
                    category: item.category,
                    posterPath: item.posterPath,
                    releaseYear: item.releaseYear,
                    voteAverage: item.voteAverage,
                  })
                }
                className="orbis-press orbis-card-hover w-28 sm:w-36 shrink-0 text-left space-y-1.5 group"
              >
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 bg-[#0d1017]">
                  <PosterImage
                    posterPath={item.posterPath}
                    title={item.title}
                    category={item.category}
                    size="w342"
                    className="w-full h-full"
                  />
                  <span className="absolute top-1.5 left-1.5 rounded-md bg-black/80 border border-white/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300 tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>
                <div>
                  <p className="font-serif text-sm text-white truncate group-hover:text-amber-300">
                    {item.title}
                  </p>
                  <p className="font-mono text-[10px] text-zinc-400 tabular-nums">
                    {formatCategoryLabel(item.category)} · ★{" "}
                    {item.voteAverage || "—"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Currently Watching Episodic Tracker */}
      {watchingList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                In Progress
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-white">
                Currently Watching
              </h2>
            </div>
            <span className="font-mono text-xs text-zinc-400 tabular-nums">
              {formatCount(
                watchingList.length,
                "active title",
                "active titles",
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {watchingList.map((item) => {
              const pct = item.totalEpisodes
                ? Math.min(
                    100,
                    Math.round(
                      (item.watchedEpisodes / item.totalEpisodes) * 100,
                    ),
                  )
                : null;
              return (
                <div
                  key={item.key}
                  className="orbis-card-hover rounded-2xl border border-white/10 bg-[#0d1017] p-3.5 flex gap-3.5 items-start"
                >
                  <button
                    onClick={() =>
                      openDossier(item.tmdbType, item.tmdbId, {
                        title: item.title,
                        category: item.category,
                        posterPath: item.posterPath,
                        releaseYear: item.releaseYear,
                      })
                    }
                    className="orbis-press shrink-0"
                  >
                    <PosterImage
                      posterPath={item.posterPath}
                      title={item.title}
                      category={item.category}
                      className="w-16 h-24 rounded-xl"
                    />
                  </button>
                  <div className="min-w-0 flex-1 flex flex-col justify-between h-24">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                        {formatCategoryLabel(item.category)}
                      </span>
                      <h3
                        onClick={() =>
                          openDossier(item.tmdbType, item.tmdbId, {
                            title: item.title,
                            category: item.category,
                            posterPath: item.posterPath,
                            releaseYear: item.releaseYear,
                          })
                        }
                        className="font-serif text-lg text-white truncate cursor-pointer hover:text-amber-300"
                      >
                        {item.title}
                      </h3>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-zinc-300 tabular-nums">
                          Ep{" "}
                          <NumberFlow
                            value={item.watchedEpisodes}
                            className="inline-block"
                          />
                          {item.totalEpisodes ? ` / ${item.totalEpisodes}` : ""}
                        </span>
                        <button
                          onClick={() => stepEpisode(item, 1)}
                          className="orbis-press flex items-center gap-1 rounded-lg bg-cyan-400/15 border border-cyan-400/35 px-2.5 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-400/25"
                        >
                          <Plus className="size-3" />1 Ep
                        </button>
                      </div>
                      {pct !== null && (
                        <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-cyan-400 transition-[width] duration-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Four Favorites 35mm Parallax Marquee */}
      <div ref={stripRef} className="space-y-4 overflow-hidden">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400">
              Hall of Fame
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-white">
              Four Favorites
            </h2>
          </div>
          <p className="text-xs text-zinc-400 hidden sm:block">
            Pin any title to slots #1–#4 inside its Dossier
          </p>
        </div>

        <motion.div
          style={reduceMotion ? undefined : { x: stripX }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 py-1"
        >
          {[0, 1, 2, 3].map((idx) => {
            const fav = fourFavorites[idx];
            if (!fav) {
              return (
                <button
                  key={`slot-${idx}`}
                  onClick={() => setCommandOpen(true)}
                  className="orbis-press aspect-[2/3] rounded-2xl border border-dashed border-white/15 bg-white/[0.02] flex flex-col items-center justify-center gap-2 p-4 text-center hover:border-amber-400/40"
                >
                  <span className="font-mono text-xs text-zinc-500">
                    SLOT #{idx + 1}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Pin an all-time favorite
                  </span>
                </button>
              );
            }
            return (
              <button
                key={fav.key}
                onClick={() =>
                  openDossier(fav.tmdbType, fav.tmdbId, {
                    title: fav.title,
                    category: fav.category,
                    posterPath: fav.posterPath,
                    releaseYear: fav.releaseYear,
                  })
                }
                className="orbis-press orbis-card-hover group relative aspect-[2/3] rounded-2xl overflow-hidden border border-amber-400/30 bg-[#0d1017] text-left"
              >
                <PosterImage
                  posterPath={fav.posterPath}
                  title={fav.title}
                  category={fav.category}
                  className="w-full h-full"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3">
                  <span className="font-mono text-[10px] text-amber-400">
                    #{idx + 1} · {formatCategoryLabel(fav.category)}
                  </span>
                  <p className="font-serif text-lg leading-tight text-white truncate">
                    {fav.title}
                  </p>
                </div>
              </button>
            );
          })}
        </motion.div>
      </div>

      {/* Main Diary Archive */}
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400">
              Screening Journal
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-white">
              Your Cinema Archive
            </h2>
          </div>

          {/* Single-row View Switcher + Settings Gear (Fits 360px Galaxy S24 without wrapping gear onto a new row!) */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex-1 md:flex-initial grid grid-cols-3 items-center rounded-full border border-white/10 bg-[#0d1017] p-1">
              <button
                onClick={() => setView("timeline")}
                className={`orbis-press flex items-center justify-center gap-1.5 rounded-full px-2.5 sm:px-3.5 py-1.5 text-xs font-medium whitespace-nowrap ${
                  view === "timeline"
                    ? "bg-white text-black"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                <List className="size-3.5 shrink-0" />
                <span>Timeline</span>
              </button>
              <button
                onClick={() => setView("closet")}
                className={`orbis-press flex items-center justify-center gap-1.5 rounded-full px-2.5 sm:px-3.5 py-1.5 text-xs font-medium whitespace-nowrap ${
                  view === "closet"
                    ? "bg-amber-400 text-black"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                <Award className="size-3.5 shrink-0" />
                <span>
                  <span className="hidden sm:inline">Criterion </span>Closet
                </span>
              </button>
              <button
                onClick={() => setView("analytics")}
                className={`orbis-press flex items-center justify-center gap-1.5 rounded-full px-2.5 sm:px-3.5 py-1.5 text-xs font-medium whitespace-nowrap ${
                  view === "analytics"
                    ? "bg-cyan-400 text-black"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                <BarChart3 className="size-3.5 shrink-0" />
                <span>Analytics</span>
              </button>
            </div>

            <Popover.Root>
              <Popover.Trigger
                aria-label="Settings and backup"
                className="orbis-press shrink-0 rounded-full border border-white/15 bg-[#0d1017] p-2.5 text-zinc-300 hover:text-white"
              >
                <Settings className="size-4" />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner sideOffset={10} align="end">
                  <Popover.Popup className="orbis-popover orbis-glass z-40 w-72 rounded-2xl p-4 space-y-4">
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5">
                        Streaming Region (JustWatch)
                      </label>
                      <OrbisSelect
                        ariaLabel="Streaming Region"
                        value={region}
                        onValueChange={(val) => void updateRegion(val)}
                        className="w-full"
                        options={[
                          { value: "IN", label: "India (IN)" },
                          { value: "US", label: "United States (US)" },
                          { value: "GB", label: "United Kingdom (GB)" },
                          { value: "JP", label: "Japan (JP)" },
                          { value: "KR", label: "South Korea (KR)" },
                          { value: "CA", label: "Canada (CA)" },
                        ]}
                      />
                    </div>

                    <div className="space-y-2 border-t border-white/10 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          const { entries: curEntries, region: curRegion } =
                            useOrbisStore.getState();
                          const backup = {
                            version: 1,
                            region: curRegion,
                            entries: curEntries,
                          };
                          const blob = new Blob(
                            [JSON.stringify(backup, null, 2)],
                            { type: "application/json" },
                          );
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = `kinema-backup-${new Date().toISOString().slice(0, 10)}.json`;
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.setTimeout(
                            () => URL.revokeObjectURL(url),
                            1000,
                          );
                        }}
                        className="orbis-press flex items-center justify-center gap-2 w-full rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-medium text-white"
                      >
                        <Download className="size-3.5" />
                        Export Backup JSON
                      </button>
                      <label className="orbis-press flex items-center justify-center gap-2 w-full rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-medium text-zinc-300 cursor-pointer">
                        <Upload className="size-3.5" />
                        Import Backup JSON
                        <input
                          type="file"
                          accept="application/json"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleImportJson(file);
                          }}
                        />
                      </label>
                    </div>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>

        {/* Filter Chips — Clean horizontal swipe bar on mobile + Status Select */}
        {view === "timeline" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {(
                ["all", "film", "series", "anime", "drama", "doc"] as const
              ).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`orbis-press whitespace-nowrap rounded-full px-3 py-1.5 text-xs border shrink-0 ${
                    categoryFilter === cat
                      ? "border-cyan-400 bg-cyan-400/15 text-cyan-200"
                      : "border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  {cat === "all" ? "All Types" : formatCategoryLabel(cat)}
                </button>
              ))}
            </div>

            <OrbisSelect
              ariaLabel="Filter by watch status"
              value={statusFilter}
              onValueChange={setStatusFilter}
              className="w-full sm:w-auto sm:min-w-[148px]"
              options={[
                { value: "all", label: "All Statuses" },
                { value: "completed", label: "Completed" },
                { value: "watching", label: "Watching" },
                { value: "watchlist", label: "Watchlist" },
                { value: "on_hold", label: "On Hold" },
                { value: "dropped", label: "Dropped" },
              ]}
            />
          </div>
        )}

        {/* VIEW 1: TIMELINE */}
        {view === "timeline" && (
          <>
            {filteredEntries.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-[#0d1017]/60 p-10 text-center space-y-4">
                <Film className="size-8 text-amber-400/80 mx-auto" />
                <div>
                  <h3 className="font-serif text-2xl text-white">
                    {entries.length === 0
                      ? "Your screening diary is blank."
                      : "No entries match this filter."}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
                    Click any poster on the globe above, search across all of
                    TMDB with ⌘K, or spin one of the 4 randomizers.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2.5">
                  <button
                    onClick={() => setCommandOpen(true)}
                    className="orbis-press flex items-center gap-2 rounded-full bg-white text-black px-4 py-2 text-xs font-semibold"
                  >
                    <Search className="size-3.5" />
                    Log Your First Title
                  </button>
                  <button
                    onClick={() => openRandomizer("ticket")}
                    className="orbis-press flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-zinc-200"
                  >
                    <Sparkles className="size-3.5 text-amber-400" />
                    Draw Mystery Ticket
                  </button>
                </div>
              </div>
            ) : (
              <Virtuoso
                useWindowScroll
                data={filteredEntries}
                itemContent={(_, item) => {
                  const spoilerVisible = unblurredSpoilers.has(item.key);
                  return (
                    <div className="pb-3.5">
                      <article className="orbis-card-hover rounded-2xl border border-white/10 bg-[#0d1017] p-3.5 sm:p-4 flex gap-3.5 sm:gap-4 items-start">
                        <button
                          onClick={() =>
                            openDossier(item.tmdbType, item.tmdbId, {
                              title: item.title,
                              category: item.category,
                              posterPath: item.posterPath,
                              releaseYear: item.releaseYear,
                            })
                          }
                          className="orbis-press shrink-0"
                        >
                          <PosterImage
                            posterPath={item.posterPath}
                            title={item.title}
                            category={item.category}
                            className="w-16 sm:w-20 h-24 sm:h-28 rounded-xl"
                          />
                        </button>

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400 tabular-nums">
                                <span className="text-cyan-300">
                                  {formatCategoryLabel(item.category)}
                                </span>
                                <span>·</span>
                                <span>{item.watchedDate}</span>
                                <span className="hidden xs:inline">·</span>
                                <span className="text-zinc-500">
                                  {item.context}
                                </span>
                              </div>
                              <h3
                                onClick={() =>
                                  openDossier(item.tmdbType, item.tmdbId, {
                                    title: item.title,
                                    category: item.category,
                                    posterPath: item.posterPath,
                                    releaseYear: item.releaseYear,
                                  })
                                }
                                className="font-serif text-lg sm:text-2xl leading-snug text-white hover:text-amber-300 cursor-pointer break-words mt-0.5"
                              >
                                {item.title}{" "}
                                <span className="text-xs sm:text-sm font-mono text-zinc-500 tabular-nums">
                                  ({item.releaseYear})
                                </span>
                              </h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-0.5 sm:pt-0">
                              {item.collectionName && (
                                <button
                                  onClick={() =>
                                    openDossier(item.tmdbType, item.tmdbId)
                                  }
                                  className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-200"
                                >
                                  <Layers className="size-2.5" />
                                  Saga
                                </button>
                              )}
                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] text-zinc-300">
                                {item.status.replace("_", " ")}
                              </span>
                              {item.rating && (
                                <span className="rounded-full bg-amber-400/15 border border-amber-400/35 px-2.5 py-0.5 font-mono text-[11px] sm:text-xs font-semibold text-amber-300 tabular-nums">
                                  {item.rating.toFixed(1)} ★
                                </span>
                              )}
                            </div>
                          </div>

                          {item.quote && (
                            <p className="font-serif italic text-sm sm:text-base text-amber-200/90 leading-snug">
                              “{item.quote}”
                            </p>
                          )}

                          {item.note && (
                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                              {item.note}
                            </p>
                          )}

                          {item.spoilerNote && (
                            <button
                              onClick={() => toggleSpoiler(item.key)}
                              className="text-left block w-full rounded-xl border border-white/10 bg-black/40 p-2.5"
                            >
                              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                                <Eye className="size-3" />
                                Spoiler Note —{" "}
                                {spoilerVisible
                                  ? "Click to hide"
                                  : "Click to reveal"}
                              </span>
                              <p
                                className={`text-xs text-zinc-300 transition-[filter] duration-200 ${
                                  spoilerVisible ? "blur-none" : "blur-sm"
                                }`}
                              >
                                {item.spoilerNote}
                              </p>
                            </button>
                          )}

                          {item.moodTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {item.moodTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-zinc-400"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    </div>
                  );
                }}
              />
            )}
          </>
        )}

        {/* VIEW 2: CRITERION CLOSET */}
        {view === "closet" && (
          <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-b from-[#11141e] to-[#080a0f] p-5 sm:p-8 space-y-6">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400">
                4.5★+ & Favorites Shelf
              </span>
              <h3 className="font-serif text-3xl text-white">
                The Criterion Closet
              </h3>
            </div>
            {closetEntries.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Rate any title 4.5★ or higher (or tap Heart) to place it on your
                illuminated closet shelf.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {closetEntries.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => openDossier(item.tmdbType, item.tmdbId)}
                    className="orbis-press orbis-card-hover text-left space-y-2"
                  >
                    <PosterImage
                      posterPath={item.posterPath}
                      title={item.title}
                      category={item.category}
                      className="w-full aspect-[2/3] rounded-xl border border-amber-400/25 shadow-xl"
                    />
                    <p className="font-serif text-base text-white truncate">
                      {item.title}
                    </p>
                    <p className="font-mono text-[11px] text-amber-300 tabular-nums">
                      {item.rating ? `${item.rating.toFixed(1)} ★` : "Favorite"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: ANALYTICS + TOP ACTORS/DIRECTORS CONSTELLATIONS */}
        {view === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              {[
                { label: "Total Logged", value: stats.totalLogged },
                { label: "Completed", value: stats.completedCount },
                { label: "Watchlist Queue", value: stats.watchlistCount },
                { label: "Hours in Cosmos", value: stats.totalHours },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-2xl border border-white/10 bg-[#0d1017] p-4"
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                    {kpi.label}
                  </p>
                  <p className="mt-1 font-serif text-3xl sm:text-4xl text-white tabular-nums">
                    <NumberFlow value={kpi.value} />
                  </p>
                </div>
              ))}
            </div>

            {stats.topPeople.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#0d1017] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-400">
                    <Users className="size-3.5" />
                    Your Most-Watched Actors & Directors
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500 hidden sm:inline">
                    Click to open Constellation
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.topPeople.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openPerson(p.id)}
                      className="orbis-press rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white hover:border-cyan-400/50 flex items-center gap-2"
                    >
                      <span>{p.name}</span>
                      <span className="font-mono text-[10px] text-cyan-300 tabular-nums">
                        {p.count}×
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-[#0d1017] p-5 h-72">
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-3">
                Cosmos Breakdown by Medium
              </p>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={stats.byCategory}>
                  <XAxis
                    dataKey="name"
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "#141824",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {stats.byCategory.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={idx % 2 === 0 ? "#38bdf8" : "#f59e0b"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Required TMDB & JustWatch Attribution Footer */}
      <footer className="border-t border-white/10 pt-8 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-zinc-500">
        <div className="space-y-1">
          <p className="font-serif text-base text-zinc-300">
            KINEMA — Personal Cinema Atlas
          </p>
          <p>
            This product uses the TMDB API but is not endorsed or certified by
            TMDB. Streaming availability powered by JustWatch.
          </p>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          CLOUD ARCHIVE · {region}
        </span>
      </footer>
    </section>
  );
}
