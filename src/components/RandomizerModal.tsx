"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { TextMorph } from "torph/react";
import { motion } from "motion/react";
import { Compass, Crosshair, Film, RefreshCw, Ticket, X } from "lucide-react";
import { toast } from "sonner";
import { useOrbisStore, type RandomizerTab } from "@/store/useOrbisStore";
import { formatCategoryLabel } from "@/lib/classify";
import { fetchJsonWithRetry } from "@/lib/fetchWithRetry";
import { PosterImage } from "./PosterImage";
import { OrbisSelect, OrbisSlider, OrbisSwitch } from "./ui/OrbisControls";
import type { CosmosNode, MediaCategory } from "@/lib/types";

const CATEGORIES: { id: MediaCategory | "all"; label: string }[] = [
  { id: "all", label: "Any Media" },
  { id: "film", label: "Films" },
  { id: "series", label: "Series & Web" },
  { id: "anime", label: "Anime" },
  { id: "drama", label: "Dramas" },
  { id: "doc", label: "Docs" },
];

const TIME_SLOTS = [
  { id: "ep", label: "< 45m Ep", maxRuntime: 45, cat: "series" },
  { id: "tight", label: "< 2h Film", maxRuntime: 120, cat: "film" },
  { id: "anime", label: "Anime Night", maxRuntime: undefined, cat: "anime" },
  { id: "drama", label: "Drama Pilot", maxRuntime: undefined, cat: "drama" },
];

const MOODS = [
  { label: "Adrenaline", cat: "film", maxRuntime: 130 },
  { label: "Mind-Bending", cat: "series", maxRuntime: undefined },
  { label: "Late-Night Anime", cat: "anime", maxRuntime: undefined },
  { label: "Heartache / Drama", cat: "drama", maxRuntime: undefined },
  { label: "Real World Doc", cat: "doc", maxRuntime: 110 },
];

export function RandomizerModal() {
  const {
    randomizerOpen,
    closeRandomizer,
    randomizerTab,
    openRandomizer,
    cosmosNodes,
    entries,
    triggerGlobeSpin,
    openDossier,
  } = useOrbisStore();

  const [spinCat, setSpinCat] = useState<MediaCategory | "all">("all");
  const [includeRewatches, setIncludeRewatches] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[1]);
  const [useWatchlistFirst, setUseWatchlistFirst] = useState(true);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [roulettePick, setRoulettePick] = useState<CosmosNode | null>(null);

  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [ticketNode, setTicketNode] = useState<CosmosNode | null>(null);
  const [peelPercent, setPeelPercent] = useState(0);
  const [peeling, setPeeling] = useState(false);
  const [printingTicket, setPrintingTicket] = useState(false);

  const completedEntries = useMemo(
    () => entries.filter((e) => e.status === "completed" || e.favorite),
    [entries],
  );
  const [seedKey, setSeedKey] = useState<string>("");
  const [detourLevel, setDetourLevel] = useState(35);
  const [compassPicks, setCompassPicks] = useState<CosmosNode[]>([]);
  const [loadingCompass, setLoadingCompass] = useState(false);

  const unwatchedPool = useMemo(
    () =>
      cosmosNodes.filter(
        (n) =>
          n.diary?.status === "watchlist" ||
          (n.source === "starter" && !n.diary),
      ),
    [cosmosNodes],
  );

  function openNodeWithSeed(node: CosmosNode) {
    closeRandomizer();
    openDossier(node.tmdbType, node.tmdbId, {
      title: node.title,
      category: node.category,
      posterPath: node.posterPath,
      releaseYear: node.releaseYear,
      voteAverage: node.voteAverage,
    });
  }

  async function runRoulette() {
    setRouletteSpinning(true);
    let pool = useWatchlistFirst
      ? unwatchedPool.filter((n) => n.category === selectedSlot.cat)
      : [];

    if (pool.length === 0) {
      try {
        const params = new URLSearchParams({ category: selectedSlot.cat });
        if (selectedSlot.maxRuntime) {
          params.set("maxRuntime", String(selectedSlot.maxRuntime));
        }
        const data = await fetchJsonWithRetry<{ results: CosmosNode[] }>(
          `/api/tmdb/discover?${params.toString()}`,
        );
        pool = data.results?.length ? data.results : unwatchedPool;
      } catch {
        pool = unwatchedPool;
      }
    }

    const valid = pool.length ? pool : cosmosNodes;
    let ticks = 0;
    const interval = setInterval(() => {
      setRoulettePick(valid[ticks % valid.length]);
      ticks++;
      if (ticks > 12) {
        clearInterval(interval);
        const winner = valid[Math.floor(Math.random() * valid.length)];
        setRoulettePick(winner);
        setRouletteSpinning(false);
      }
    }, 95);
  }

  async function printTicket() {
    setPrintingTicket(true);
    setPeelPercent(0);
    try {
      let pool = unwatchedPool.filter((n) => n.category === selectedMood.cat);
      if (pool.length === 0) {
        const data = await fetchJsonWithRetry<{ results: CosmosNode[] }>(
          `/api/tmdb/discover?category=${selectedMood.cat}`,
        );
        pool = data.results?.length ? data.results : unwatchedPool;
      }
      const chosen =
        pool[Math.floor(Math.random() * pool.length)] ?? cosmosNodes[0];
      setTicketNode(chosen || null);
    } catch {
      const fallback = unwatchedPool[0] ?? cosmosNodes[0] ?? null;
      setTicketNode(fallback);
      if (!fallback) toast.error("No titles available to print ticket");
    } finally {
      setPrintingTicket(false);
    }
  }

  async function runCompass() {
    setLoadingCompass(true);
    try {
      const anchor =
        completedEntries.find((e) => e.key === seedKey) ??
        completedEntries[0] ??
        cosmosNodes[0];

      if (!anchor) return;
      const isWildcard = detourLevel > 60;
      const params = new URLSearchParams(
        isWildcard
          ? { category: anchor.category === "film" ? "anime" : "film" }
          : { seedType: anchor.tmdbType, seedId: String(anchor.tmdbId) },
      );
      const data = await fetchJsonWithRetry<{ results: CosmosNode[] }>(
        `/api/tmdb/discover?${params.toString()}`,
      );
      setCompassPicks(
        (data.results || []).filter((r) => r.key !== anchor.key).slice(0, 3),
      );
    } catch {
      toast.error("TMDB is slow right now — tap again to retry");
    } finally {
      setLoadingCompass(false);
    }
  }

  const tabs: { id: RandomizerTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "spin",
      label: "Spin & Lock",
      icon: <Crosshair className="size-3.5" />,
    },
    { id: "roulette", label: "35mm Reel", icon: <Film className="size-3.5" /> },
    {
      id: "ticket",
      label: "Mystery Ticket",
      icon: <Ticket className="size-3.5" />,
    },
    {
      id: "compass",
      label: "6 Degrees",
      icon: <Compass className="size-3.5" />,
    },
  ];

  return (
    <Dialog.Root
      open={randomizerOpen}
      onOpenChange={(open) => !open && closeRandomizer()}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="orbis-dialog-backdrop fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="orbis-dialog-popup orbis-glass w-full max-w-xl rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[88dvh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400">
                  Randomizer Suite
                </p>
                <Dialog.Title className="font-serif text-2xl sm:text-3xl text-white mt-0.5">
                  Spin the Cosmos
                </Dialog.Title>
              </div>
              <Dialog.Close className="orbis-press rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white">
                <X className="size-4" />
              </Dialog.Close>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-2xl bg-black/40 p-1.5 border border-white/10">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openRandomizer(t.id)}
                  className={`orbis-press flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-medium ${
                    randomizerTab === t.id
                      ? "bg-white text-black"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {randomizerTab === "spin" && (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-zinc-300">
                  Whips the 3D globe into high-velocity orbit and magnetically
                  locks an unwatched title directly beneath the target reticle.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSpinCat(c.id)}
                      className={`orbis-press rounded-full px-3 py-1.5 text-xs border ${
                        spinCat === c.id
                          ? "bg-cyan-400/20 border-cyan-400 text-cyan-200"
                          : "border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <OrbisSwitch
                  checked={includeRewatches}
                  onCheckedChange={setIncludeRewatches}
                  accent="amber"
                  label="Include titles already marked Completed (allow rewatches)"
                />

                <button
                  onClick={() => triggerGlobeSpin(spinCat, includeRewatches)}
                  className="orbis-press w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-300 text-black font-semibold py-3 text-sm hover:opacity-95"
                >
                  Flick & Lock on 3D Globe
                </button>
              </div>
            )}

            {randomizerTab === "roulette" && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={`orbis-press rounded-xl border p-2.5 text-xs font-medium ${
                        selectedSlot.id === slot.id
                          ? "border-amber-400 bg-amber-400/15 text-amber-200"
                          : "border-white/10 text-zinc-300"
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>

                <OrbisSwitch
                  checked={useWatchlistFirst}
                  onCheckedChange={setUseWatchlistFirst}
                  accent="amber"
                  label="Prioritize my Watchlist before TMDB Surprise"
                />

                <div className="rounded-2xl border border-white/10 bg-black/50 p-4 min-h-[140px] flex items-center gap-4">
                  {roulettePick ? (
                    <>
                      <PosterImage
                        posterPath={roulettePick.posterPath}
                        title={roulettePick.title}
                        category={roulettePick.category}
                        className="w-20 h-28 rounded-xl shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
                          {rouletteSpinning
                            ? "ROLLING REEL…"
                            : "SELECTED TONIGHT"}
                        </span>
                        <h3 className="font-serif text-2xl text-white truncate mt-1">
                          <TextMorph>{roulettePick.title}</TextMorph>
                        </h3>
                        <p className="font-mono text-xs text-zinc-400 mt-1">
                          {formatCategoryLabel(roulettePick.category)} ·{" "}
                          {roulettePick.releaseYear} · ★{" "}
                          {roulettePick.voteAverage || "—"}
                        </p>
                        {!rouletteSpinning && (
                          <button
                            onClick={() => openNodeWithSeed(roulettePick)}
                            className="orbis-press mt-3 rounded-lg bg-white text-black px-3.5 py-1.5 text-xs font-medium"
                          >
                            Open Dossier
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500 mx-auto">
                      Pick your time window and roll the 35mm reel.
                    </p>
                  )}
                </div>

                <button
                  onClick={runRoulette}
                  disabled={rouletteSpinning}
                  className="orbis-press w-full rounded-2xl bg-amber-400 text-black font-semibold py-3 text-sm disabled:opacity-60"
                >
                  {rouletteSpinning ? "Spinning Reel…" : "Roll 35mm Reel"}
                </button>
              </div>
            )}

            {randomizerTab === "ticket" && (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-zinc-300">
                  Pick a mood, print a stub, and drag across the seal to tear
                  open tonight’s screening.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MOODS.map((m) => (
                    <button
                      key={m.label}
                      onClick={() => setSelectedMood(m)}
                      className={`orbis-press rounded-full px-3 py-1.5 text-xs border ${
                        selectedMood.label === m.label
                          ? "border-emerald-400 bg-emerald-400/15 text-emerald-200"
                          : "border-white/10 text-zinc-400"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {ticketNode && (
                  <div className="orbis-ticket-edge relative overflow-hidden rounded-2xl border border-amber-400/30 bg-[#12151f] p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400">
                          ADMIT ONE · {selectedMood.label.toUpperCase()}
                        </span>
                        <h3 className="font-serif text-2xl text-white mt-1 truncate">
                          {ticketNode.title}
                        </h3>
                        <p className="font-mono text-xs text-zinc-400 mt-1">
                          {formatCategoryLabel(ticketNode.category)} ·{" "}
                          {ticketNode.releaseYear}
                        </p>
                      </div>
                      {peelPercent >= 85 && (
                        <button
                          onClick={() => openNodeWithSeed(ticketNode)}
                          className="orbis-press rounded-xl bg-white text-black px-3.5 py-2 text-xs font-medium shrink-0"
                        >
                          View Details
                        </button>
                      )}
                    </div>

                    {peelPercent < 85 && (
                      <div
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setPeeling(true);
                        }}
                        onPointerMove={(e) => {
                          if (!peeling) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pct = Math.min(
                            100,
                            Math.max(
                              0,
                              ((e.clientX - rect.left) / rect.width) * 100,
                            ),
                          );
                          setPeelPercent(pct);
                        }}
                        onPointerUp={() => {
                          setPeeling(false);
                          if (peelPercent < 85) setPeelPercent(0);
                        }}
                        style={{
                          clipPath: `inset(0 0 0 ${peelPercent}%)`,
                          transition: peeling
                            ? "none"
                            : "clip-path 200ms var(--ease-out)",
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-300 text-black flex items-center justify-between px-6 cursor-ew-resize touch-none"
                      >
                        <span className="font-mono text-xs font-bold uppercase tracking-widest">
                          Drag right to tear seal →
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPeelPercent(100);
                          }}
                          className="rounded-full bg-black/15 px-2.5 py-1 font-mono text-[10px] font-semibold"
                        >
                          Tap Reveal
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={printTicket}
                  disabled={printingTicket}
                  className="orbis-press w-full rounded-2xl bg-emerald-400 text-black font-semibold py-3 text-sm disabled:opacity-60"
                >
                  {printingTicket
                    ? "Printing Ticket…"
                    : ticketNode
                      ? "Print Another Ticket"
                      : "Print Mystery Ticket"}
                </button>
              </div>
            )}

            {randomizerTab === "compass" && (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5">
                    Anchor Title
                  </label>
                  <OrbisSelect
                    ariaLabel="Anchor Title"
                    value={seedKey}
                    onValueChange={setSeedKey}
                    className="w-full"
                    options={[
                      {
                        value: "",
                        label: "Auto-pick from your favorites / starter cosmos",
                      },
                      ...(completedEntries.length
                        ? completedEntries
                        : cosmosNodes
                      )
                        .slice(0, 20)
                        .map((item) => ({
                          value: item.key,
                          label: `${item.title} (${item.releaseYear})`,
                        })),
                    ]}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                    <span>Comfort Twin</span>
                    <span className="text-cyan-300 tabular-nums">
                      {detourLevel}% Detour
                    </span>
                    <span>Cross-Medium Wildcard</span>
                  </div>
                  <OrbisSlider
                    ariaLabel="Similarity detour level"
                    value={detourLevel}
                    onValueChange={setDetourLevel}
                    min={0}
                    max={100}
                    step={5}
                    accent="cyan"
                  />
                </div>

                {compassPicks.length > 0 && (
                  <div className="grid grid-cols-3 gap-2.5">
                    {compassPicks.map((p) => (
                      <motion.button
                        key={p.key}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => openNodeWithSeed(p)}
                        className="orbis-press rounded-xl border border-white/10 bg-black/40 p-2 text-left"
                      >
                        <PosterImage
                          posterPath={p.posterPath}
                          title={p.title}
                          category={p.category}
                          className="w-full aspect-[2/3] rounded-lg"
                        />
                        <p className="mt-1.5 text-xs font-medium text-white truncate">
                          {p.title}
                        </p>
                        <p className="font-mono text-[10px] text-zinc-400">
                          {formatCategoryLabel(p.category)}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                )}

                <button
                  onClick={runCompass}
                  disabled={loadingCompass}
                  className="orbis-press w-full flex items-center justify-center gap-2 rounded-2xl bg-white text-black font-semibold py-3 text-sm"
                >
                  <RefreshCw
                    className={`size-4 ${loadingCompass ? "animate-spin" : ""}`}
                  />
                  <span>Chart Six Degrees</span>
                </button>
              </div>
            )}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
