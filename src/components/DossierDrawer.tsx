"use client";

import { useCallback, useEffect, useState } from "react";
import { Drawer } from "@base-ui/react/drawer";
import {
  AlertTriangle,
  Bookmark,
  Check,
  Clapperboard,
  Eye,
  Heart,
  Layers,
  Minus,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useOrbisStore } from "@/store/useOrbisStore";
import { formatCategoryLabel, formatRuntime } from "@/lib/classify";
import { fetchJsonWithRetry } from "@/lib/fetchWithRetry";
import { PosterImage } from "./PosterImage";
import { OrbisDatePicker, OrbisSlider } from "./ui/OrbisControls";
import type {
  CosmosNode,
  DiaryEntry,
  DiaryStatus,
  MediaDossier,
  ScreeningContext,
} from "@/lib/types";

const CONTEXTS: ScreeningContext[] = [
  "Theater / IMAX",
  "Late Night",
  "Rainy Afternoon",
  "With Friends",
  "Rewatch",
  "Solo Focus",
];

const STATUSES: { id: DiaryStatus; label: string }[] = [
  { id: "completed", label: "Completed" },
  { id: "watching", label: "Watching" },
  { id: "watchlist", label: "Watchlist" },
  { id: "on_hold", label: "On Hold" },
  { id: "dropped", label: "Dropped" },
];

export function DossierDrawer() {
  const {
    dossierTarget,
    closeDossier,
    entries,
    region,
    saveEntry,
    deleteEntry,
    openDossier,
    openPerson,
  } = useOrbisStore();

  const [dossier, setDossier] = useState<MediaDossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [playTrailer, setPlayTrailer] = useState(false);
  const [revealSpoiler, setRevealSpoiler] = useState(false);

  const [status, setStatus] = useState<DiaryStatus>("completed");
  const [rating, setRating] = useState<number>(4);
  const [favorite, setFavorite] = useState(false);
  const [fourSlot, setFourSlot] = useState<number | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState(0);
  const [watchedDate, setWatchedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [context, setContext] = useState<ScreeningContext>("Late Night");
  const [moodInput, setMoodInput] = useState("");
  const [quote, setQuote] = useState("");
  const [note, setNote] = useState("");
  const [spoilerNote, setSpoilerNote] = useState("");

  const existingEntry = dossierTarget
    ? entries.find(
        (e) => e.key === `${dossierTarget.tmdbType}-${dossierTarget.tmdbId}`,
      )
    : undefined;

  const loadDossier = useCallback(
    async (signal?: AbortSignal) => {
      if (!dossierTarget) return;
      setLoading(true);
      setLoadFailed(false);

      try {
        const data = await fetchJsonWithRetry<{ dossier: MediaDossier }>(
          `/api/tmdb/dossier/${dossierTarget.tmdbType}/${dossierTarget.tmdbId}?region=${region}`,
          { signal },
          3,
        );
        const d = data.dossier;
        setDossier(d);

        const match = useOrbisStore
          .getState()
          .entries.find((e) => e.key === d.key);

        if (match) {
          setStatus(match.status);
          setRating(match.rating ?? 4);
          setFavorite(match.favorite);
          setFourSlot(match.fourFavoriteSlot);
          setWatchedEpisodes(match.watchedEpisodes);
          setWatchedDate(match.watchedDate);
          setContext(match.context);
          setMoodInput(match.moodTags.join(", "));
          setQuote(match.quote);
          setNote(match.note);
          setSpoilerNote(match.spoilerNote);
        } else {
          setStatus(d.tmdbType === "tv" ? "watching" : "completed");
          setRating(4);
          setFavorite(false);
          setFourSlot(null);
          setWatchedEpisodes(d.tmdbType === "tv" ? 1 : 0);
          setWatchedDate(new Date().toISOString().slice(0, 10));
          setContext("Late Night");
          setMoodInput("");
          setQuote("");
          setNote("");
          setSpoilerNote("");
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [dossierTarget, region],
  );

  useEffect(() => {
    if (!dossierTarget) {
      setDossier(null);
      setLoadFailed(false);
      setPlayTrailer(false);
      setRevealSpoiler(false);
      return;
    }

    const controller = new AbortController();
    setPlayTrailer(false);
    setRevealSpoiler(false);
    void loadDossier(controller.signal);
    return () => controller.abort();
  }, [dossierTarget, loadDossier]);

  function handleSave(targetStatus?: DiaryStatus) {
    if (!dossierTarget) return;
    const fallbackSeed = dossierTarget.seedNode;
    const finalStatus = targetStatus ?? status;

    const peopleSnapshot = dossier
      ? [
          ...dossier.creators.map((c) => ({
            id: c.id,
            name: c.name,
            role: c.role,
          })),
          ...dossier.cast.slice(0, 5).map((c) => ({
            id: c.id,
            name: c.name,
            role: "Cast",
          })),
        ]
      : existingEntry?.peopleSnapshot;

    const entry: DiaryEntry = {
      key: `${dossierTarget.tmdbType}-${dossierTarget.tmdbId}`,
      tmdbId: dossierTarget.tmdbId,
      tmdbType: dossierTarget.tmdbType,
      category:
        dossier?.category ??
        fallbackSeed?.category ??
        existingEntry?.category ??
        "film",
      title:
        dossier?.title ??
        fallbackSeed?.title ??
        existingEntry?.title ??
        "Untitled",
      originalTitle: dossier?.originalTitle ?? existingEntry?.originalTitle,
      posterPath:
        dossier?.posterPath ??
        fallbackSeed?.posterPath ??
        existingEntry?.posterPath ??
        null,
      backdropPath:
        dossier?.backdropPath ?? existingEntry?.backdropPath ?? null,
      releaseYear:
        dossier?.releaseYear ??
        fallbackSeed?.releaseYear ??
        existingEntry?.releaseYear ??
        "—",
      runtimeMinutes:
        dossier?.runtimeMinutes ?? existingEntry?.runtimeMinutes ?? null,
      totalEpisodes:
        dossier?.totalEpisodes ?? existingEntry?.totalEpisodes ?? null,
      totalSeasons:
        dossier?.totalSeasons ?? existingEntry?.totalSeasons ?? null,
      genres: dossier?.genres.map((g) => g.name) ?? existingEntry?.genres ?? [],
      status: finalStatus,
      rating: finalStatus === "watchlist" ? null : rating,
      favorite,
      fourFavoriteSlot: fourSlot,
      watchedEpisodes:
        finalStatus === "completed" && dossier?.totalEpisodes
          ? dossier.totalEpisodes
          : watchedEpisodes,
      currentSeason: 1,
      watchedDate,
      loggedAt: new Date().toISOString(),
      context,
      moodTags: moodInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5),
      quote: quote.trim(),
      note: note.trim(),
      spoilerNote: spoilerNote.trim(),
      collectionId:
        dossier?.collection?.id ?? existingEntry?.collectionId ?? null,
      collectionName:
        dossier?.collection?.name ?? existingEntry?.collectionName ?? null,
      peopleSnapshot,
      knownProviderIds: dossier?.providers.flatrate.map((p) => p.provider_id),
    };
    void saveEntry(entry);
    closeDossier();
  }

  async function queueMissingSequels(parts: CosmosNode[]) {
    const entryKeys = new Set(entries.map((e) => e.key));
    const missing = parts.filter((p) => !entryKeys.has(p.key));
    if (missing.length === 0) {
      toast.info("Every film in this saga is already in your archive!");
      return;
    }

    for (const part of missing) {
      await saveEntry(
        {
          key: part.key,
          tmdbId: part.tmdbId,
          tmdbType: part.tmdbType,
          category: part.category,
          title: part.title,
          posterPath: part.posterPath,
          backdropPath: null,
          releaseYear: part.releaseYear,
          runtimeMinutes: part.runtimeMinutes,
          totalEpisodes: null,
          totalSeasons: null,
          genres: part.genres,
          status: "watchlist",
          rating: null,
          favorite: false,
          fourFavoriteSlot: null,
          watchedEpisodes: 0,
          currentSeason: 1,
          watchedDate: new Date().toISOString().slice(0, 10),
          loggedAt: new Date().toISOString(),
          context: "Solo Focus",
          moodTags: [],
          quote: "",
          note: "",
          spoilerNote: "",
          collectionId: dossier?.collection?.id ?? null,
          collectionName: dossier?.collection?.name ?? null,
        },
        true,
      );
    }
    toast.success(`Added ${missing.length} remaining saga films to Watchlist`);
  }

  const seed = dossierTarget?.seedNode;
  const entryMap = new Map(entries.map((e) => [e.key, e]));

  return (
    <Drawer.Root
      open={Boolean(dossierTarget)}
      onOpenChange={(open) => !open && closeDossier()}
      swipeDirection="down"
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="orbis-drawer-backdrop fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
          <Drawer.Popup className="orbis-drawer-popup orbis-glass w-full md:max-w-xl h-[92dvh] md:h-full rounded-t-3xl md:rounded-none md:rounded-l-3xl overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/25" />
            </div>

            {loading ? (
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-cyan-300">
                    Syncing TMDB Dossier…
                  </span>
                  <Drawer.Close className="rounded-full p-2 text-zinc-400">
                    <X className="size-4" />
                  </Drawer.Close>
                </div>
                <div className="h-44 rounded-2xl bg-white/5 animate-pulse" />
                <div className="h-7 w-2/3 rounded-lg bg-white/5 animate-pulse" />
                <div className="h-20 rounded-xl bg-white/5 animate-pulse" />
                <div className="h-48 rounded-2xl bg-white/5 animate-pulse" />
              </div>
            ) : loadFailed && !dossier ? (
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <Drawer.Title className="font-serif text-2xl text-white">
                    {seed?.title ?? existingEntry?.title ?? "Connection Hiccup"}
                  </Drawer.Title>
                  <Drawer.Close className="orbis-press rounded-full p-2 text-zinc-400 hover:text-white">
                    <X className="size-4" />
                  </Drawer.Close>
                </div>

                <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 flex items-start gap-3">
                  <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm text-zinc-200">
                      TMDB timed out after 3 automatic attempts. You can retry
                      fetching full metadata or log this title offline right
                      now.
                    </p>
                    <button
                      onClick={() => void loadDossier()}
                      className="orbis-press inline-flex items-center gap-1.5 rounded-full bg-amber-400 text-black px-3.5 py-1.5 text-xs font-semibold"
                    >
                      <RefreshCw className="size-3.5" />
                      Retry TMDB
                    </button>
                  </div>
                </div>

                {(seed || existingEntry) && (
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                      Offline Quick-Log Available
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave("completed")}
                        className="orbis-press flex-1 rounded-xl bg-white text-black py-2.5 text-xs font-semibold"
                      >
                        Mark Watched
                      </button>
                      <button
                        onClick={() => handleSave("watchlist")}
                        className="orbis-press flex-1 rounded-xl border border-cyan-400/35 bg-cyan-400/10 text-cyan-200 py-2.5 text-xs font-medium"
                      >
                        + Watchlist
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : !dossier ? (
              <div className="p-8 text-center text-sm text-zinc-400">
                Select any title to inspect its dossier.
              </div>
            ) : (
              <div>
                {/* Backdrop Hero */}
                <div className="relative h-52 sm:h-60 overflow-hidden">
                  {dossier.backdropPath && (
                    <img
                      src={`/api/poster?path=${encodeURIComponent(dossier.backdropPath)}&size=w780`}
                      alt=""
                      className="w-full h-full object-cover opacity-55"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1017] via-[#0d1017]/50 to-transparent" />

                  <Drawer.Close
                    aria-label="Close dossier"
                    className="orbis-press absolute top-4 right-4 rounded-full bg-black/60 p-2 text-white border border-white/15"
                  >
                    <X className="size-4" />
                  </Drawer.Close>

                  <div className="absolute bottom-4 left-5 right-5 flex items-end gap-4">
                    <PosterImage
                      posterPath={dossier.posterPath}
                      title={dossier.title}
                      category={dossier.category}
                      size="w342"
                      className="w-20 h-28 sm:w-24 sm:h-36 rounded-xl shadow-2xl border border-white/15 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                        {formatCategoryLabel(dossier.category)} ·{" "}
                        {dossier.releaseYear}
                      </span>
                      <Drawer.Title className="font-serif text-2xl sm:text-3xl leading-tight text-white">
                        {dossier.title}
                      </Drawer.Title>
                      <Drawer.Description className="font-mono text-xs text-zinc-300 tabular-nums mt-1">
                        {formatRuntime(dossier.runtimeMinutes)}
                        {dossier.totalEpisodes
                          ? ` · ${dossier.totalEpisodes} eps`
                          : ""}
                        {` · TMDB ★ ${dossier.voteAverage || "—"}`}
                      </Drawer.Description>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 sm:p-6 space-y-6">
                  {dossier.partial && (
                    <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200 flex items-center justify-between">
                      <span>Partial metadata loaded (extras unavailable)</span>
                      <button
                        onClick={() => void loadDossier()}
                        className="underline font-mono text-[10px]"
                      >
                        Retry Full
                      </button>
                    </div>
                  )}

                  {dossier.tagline && (
                    <p className="font-serif italic text-lg text-amber-200/90">
                      “{dossier.tagline}”
                    </p>
                  )}

                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {dossier.overview}
                  </p>

                  {/* Franchise / Saga Roadmap */}
                  {dossier.collection && (
                    <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-400/10 to-transparent p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-400">
                            <Layers className="size-3.5" />
                            Franchise Saga Roadmap
                          </span>
                          <h3 className="font-serif text-xl text-white">
                            {dossier.collection.name}
                          </h3>
                        </div>
                        <button
                          onClick={() =>
                            void queueMissingSequels(dossier.collection!.parts)
                          }
                          className="orbis-press rounded-full border border-cyan-400/35 bg-cyan-400/10 px-3 py-1 text-[11px] text-cyan-200"
                        >
                          + Queue Unseen Parts
                        </button>
                      </div>

                      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                        {dossier.collection.parts.map((part, idx) => {
                          const partEntry = entryMap.get(part.key);
                          const isCurrent = part.key === dossier.key;
                          return (
                            <button
                              key={part.key}
                              onClick={() =>
                                openDossier(part.tmdbType, part.tmdbId, {
                                  title: part.title,
                                  category: part.category,
                                  posterPath: part.posterPath,
                                  releaseYear: part.releaseYear,
                                })
                              }
                              className={`orbis-press w-24 shrink-0 text-left rounded-xl p-1.5 border ${
                                isCurrent
                                  ? "border-amber-400 bg-amber-400/15"
                                  : "border-white/10 bg-black/40"
                              }`}
                            >
                              <div className="relative">
                                <PosterImage
                                  posterPath={part.posterPath}
                                  title={part.title}
                                  category={part.category}
                                  size="w185"
                                  className="w-full aspect-[2/3] rounded-lg"
                                />
                                <span className="absolute top-1 left-1 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[9px] text-white tabular-nums">
                                  {String(idx + 1).padStart(2, "0")}
                                </span>
                                {partEntry && (
                                  <span
                                    className={`absolute bottom-1 right-1 size-4 rounded-full flex items-center justify-center ${
                                      partEntry.status === "completed"
                                        ? "bg-emerald-400 text-black"
                                        : "bg-cyan-400 text-black"
                                    }`}
                                  >
                                    <Check className="size-2.5" />
                                  </span>
                                )}
                              </div>
                              <p className="mt-1.5 text-[11px] text-white truncate">
                                {part.title}
                              </p>
                              <p className="font-mono text-[10px] text-zinc-400 tabular-nums">
                                {part.releaseYear}
                                {partEntry?.rating
                                  ? ` · ${partEntry.rating}★`
                                  : ""}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Click-to-Play Trailer */}
                  {dossier.trailerKey && (
                    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/50">
                      {playTrailer ? (
                        <iframe
                          title={`${dossier.title} Trailer`}
                          src={`https://www.youtube-nocookie.com/embed/${dossier.trailerKey}?autoplay=1`}
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          className="w-full aspect-video"
                        />
                      ) : (
                        <button
                          onClick={() => setPlayTrailer(true)}
                          className="orbis-press w-full flex items-center justify-between px-4 py-3 text-xs text-zinc-200 hover:bg-white/5"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <Play className="size-4 text-amber-400 fill-amber-400" />
                            Watch Official Trailer
                          </span>
                          <span className="font-mono text-[10px] text-zinc-500">
                            YOUTUBE-NOCOOKIE
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Logging Studio */}
                  <div className="rounded-2xl border border-white/12 bg-black/35 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                        <Clapperboard className="size-3.5" />
                        Log Screening
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFavorite(!favorite)}
                          className={`orbis-press rounded-full p-2 border ${
                            favorite
                              ? "border-amber-400 bg-amber-400/20 text-amber-300"
                              : "border-white/10 text-zinc-400"
                          }`}
                          aria-label="Toggle favorite"
                        >
                          <Heart
                            className={`size-4 ${favorite ? "fill-amber-400" : ""}`}
                          />
                        </button>
                        {existingEntry && (
                          <button
                            type="button"
                            onClick={() => {
                              void deleteEntry(existingEntry.key);
                              closeDossier();
                            }}
                            className="orbis-press rounded-full p-2 border border-white/10 text-zinc-400 hover:text-red-400"
                            aria-label="Delete diary entry"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setStatus(s.id)}
                          className={`orbis-press rounded-full px-3 py-1.5 text-xs font-medium border ${
                            status === s.id
                              ? "bg-white text-black border-white"
                              : "border-white/10 text-zinc-300"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {dossier.tmdbType === "tv" && (
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <span className="text-xs text-zinc-300">
                          Episode Progress
                        </span>
                        <div className="flex items-center gap-2 font-mono text-sm tabular-nums">
                          <button
                            type="button"
                            onClick={() =>
                              setWatchedEpisodes((n) => Math.max(0, n - 1))
                            }
                            className="orbis-press rounded-lg border border-white/15 p-1.5"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="min-w-[68px] text-center text-white">
                            {watchedEpisodes}
                            {dossier.totalEpisodes
                              ? ` / ${dossier.totalEpisodes}`
                              : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setWatchedEpisodes((n) =>
                                Math.min(dossier.totalEpisodes ?? 9999, n + 1),
                              )
                            }
                            className="orbis-press rounded-lg border border-white/15 p-1.5"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {status !== "watchlist" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                            Your Rating: {rating.toFixed(1)} ★
                          </label>
                          <OrbisSlider
                            ariaLabel="Rating"
                            value={rating}
                            onValueChange={setRating}
                            min={0.5}
                            max={5}
                            step={0.5}
                            accent="amber"
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                            Date Watched
                          </label>
                          <OrbisDatePicker
                            value={watchedDate}
                            onChange={setWatchedDate}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {CONTEXTS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setContext(c)}
                          className={`orbis-press rounded-full px-2.5 py-1 text-[11px] border ${
                            context === c
                              ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-200"
                              : "border-white/10 text-zinc-400"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">
                        Four Favorites Shelf
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() =>
                              setFourSlot(fourSlot === slot ? null : slot)
                            }
                            className={`orbis-press size-7 rounded-lg font-mono text-xs border ${
                              fourSlot === slot
                                ? "border-amber-400 bg-amber-400 text-black font-bold"
                                : "border-white/15 text-zinc-400"
                            }`}
                          >
                            #{slot}
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={moodInput}
                      onChange={(e) => setMoodInput(e.target.value)}
                      placeholder="Mood tags (comma separated: atmospheric, kinetic)"
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
                    />
                    <input
                      type="text"
                      value={quote}
                      onChange={(e) => setQuote(e.target.value)}
                      placeholder="Favorite line or timestamp memory…"
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
                    />
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Journal reflection — how did it hit tonight?"
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Spoiler-Shielded Note (blurred in diary)</span>
                        {spoilerNote && (
                          <button
                            type="button"
                            onClick={() => setRevealSpoiler(!revealSpoiler)}
                            className="flex items-center gap-1 text-cyan-300"
                          >
                            <Eye className="size-3" />
                            {revealSpoiler ? "Hide" : "Preview"}
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={spoilerNote}
                        onChange={(e) => setSpoilerNote(e.target.value)}
                        placeholder="Ending thoughts hidden behind a blur curtain…"
                        className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSave()}
                        className="orbis-press flex-1 rounded-xl bg-white text-black font-semibold py-2.5 text-sm"
                      >
                        {existingEntry ? "Update Entry" : "Record Screening"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSave("watchlist")}
                        className="orbis-press flex items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-400/10 px-4 py-2.5 text-xs font-medium text-cyan-200"
                      >
                        <Bookmark className="size-3.5" />
                        Watchlist
                      </button>
                    </div>
                  </div>

                  {/* Where to Watch + JustWatch Attribution */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
                        Where to Watch ({dossier.providers.region})
                      </h3>
                      <span className="font-mono text-[10px] text-zinc-500">
                        Data via JustWatch
                      </span>
                    </div>
                    {dossier.providers.flatrate.length > 0 ||
                    dossier.providers.rent.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {[
                          ...dossier.providers.flatrate,
                          ...dossier.providers.rent,
                        ]
                          .slice(0, 8)
                          .map((p) => (
                            <div
                              key={p.provider_id}
                              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5"
                            >
                              <img
                                src={`/api/poster?path=${encodeURIComponent(p.logo_path)}&size=w185`}
                                alt={p.provider_name}
                                className="size-5 rounded"
                              />
                              <span className="text-xs text-zinc-200">
                                {p.provider_name}
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        Not currently on streaming or digital rent in{" "}
                        {dossier.providers.region}.
                      </p>
                    )}
                  </div>

                  {/* Clickable Creators & Cast -> Opens Talent Constellation! */}
                  {(dossier.creators.length > 0 || dossier.cast.length > 0) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
                          Creators & Cast
                        </h3>
                        <span className="font-mono text-[10px] text-cyan-300/80">
                          Tap any name for Constellation →
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {dossier.creators.map((c) => (
                          <button
                            key={`cr-${c.id}-${c.name}`}
                            onClick={() => openPerson(c.id)}
                            className="orbis-press rounded-lg border border-amber-400/35 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-400/20"
                          >
                            {c.name} · {c.role}
                          </button>
                        ))}
                        {dossier.cast.slice(0, 8).map((c) => (
                          <button
                            key={c.id}
                            onClick={() => openPerson(c.id)}
                            className="orbis-press rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200 hover:border-cyan-400/40"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Cosmos */}
                  {dossier.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
                        Orbiting Recommendations
                      </h3>
                      <div className="grid grid-cols-4 gap-2">
                        {dossier.recommendations.slice(0, 4).map((rec) => (
                          <button
                            key={rec.key}
                            onClick={() =>
                              openDossier(rec.tmdbType, rec.tmdbId, {
                                title: rec.title,
                                category: rec.category,
                                posterPath: rec.posterPath,
                                releaseYear: rec.releaseYear,
                              })
                            }
                            className="orbis-press text-left"
                          >
                            <PosterImage
                              posterPath={rec.posterPath}
                              title={rec.title}
                              category={rec.category}
                              className="w-full aspect-[2/3] rounded-lg"
                            />
                            <p className="mt-1 text-[11px] text-zinc-300 truncate">
                              {rec.title}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
