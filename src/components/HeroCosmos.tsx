"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import {
  Compass,
  Crosshair,
  Maximize2,
  Minimize2,
  Search,
  Shuffle,
  ArrowDown,
  Sparkles,
  Plus,
  RefreshCw,
  Radio,
  Orbit,
} from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import { useOrbisStore, type GlobeLens } from "@/store/useOrbisStore";
import { formatCategoryLabel } from "@/lib/classify";
import { PosterImage } from "./PosterImage";

const CosmosScene = dynamic(
  () => import("./CosmosScene").then((m) => m.CosmosScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="size-48 rounded-full border border-cyan-400/20 bg-radial from-cyan-500/10 to-transparent animate-pulse" />
      </div>
    ),
  },
);

const LENSES: { id: GlobeLens; label: string }[] = [
  { id: "all", label: "All Cosmos" },
  { id: "film", label: "Films" },
  { id: "series", label: "Series & Web" },
  { id: "anime", label: "Anime" },
  { id: "drama", label: "Dramas" },
  { id: "watchlist", label: "Watchlist" },
];

export function HeroCosmos() {
  const {
    cosmosNodes,
    lens,
    setLens,
    isExplored,
    setExplored,
    focusedNode,
    setFocusedNode,
    spinWinnerNode,
    setSpinWinnerNode,
    openDossier,
    setCommandOpen,
    openRandomizer,
    triggerGlobeSpin,
    spinTriggerCount,
    spinCategoryFilter,
    spinIncludeRewatches,
    shuffleCosmos,
    loadingCosmos,
    setOttRadarOpen,
    ottItems,
    entries,
  } = useOrbisStore();

  const [scrolledPast, setScrolledPast] = useState(false);
  const [heroChromeOpacity, setHeroChromeOpacity] = useState(1);
  const [timecode, setTimecode] = useState("00:00:00:00");
  const [showReticle, setShowReticle] = useState(false);
  const { scrollYProgress, scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    setHeroChromeOpacity(Math.max(0, 1 - y / 260));
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setScrolledPast(latest > 0.2);
    const totalFrames = Math.round(latest * 24 * 90);
    const ff = String(totalFrames % 24).padStart(2, "0");
    const ss = String(Math.floor(totalFrames / 24) % 60).padStart(2, "0");
    const mm = String(Math.floor(totalFrames / (24 * 60)) % 60).padStart(
      2,
      "0",
    );
    setTimecode(`00:${mm}:${ss}:${ff}`);
  });

  useEffect(() => {
    if (spinTriggerCount > 0) {
      setShowReticle(true);
      setSpinWinnerNode(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [spinTriggerCount, setSpinWinnerNode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExplored) setExplored(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExplored, setExplored]);

  const ottAlertCount = ottItems.filter((i) => i.newlyAvailable).length;

  return (
    <>
      {/* 24fps Cinema Reel Scrubber */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed right-3 top-1/2 -translate-y-1/2 z-30 hidden lg:flex flex-col items-end gap-2 text-[10px] font-mono text-zinc-500 tabular-nums"
      >
        <span className="tracking-widest text-amber-400/80">24FPS</span>
        <div className="h-24 w-px bg-white/10 relative overflow-hidden">
          <motion.div
            style={{ scaleY: scrollYProgress, transformOrigin: "top" }}
            className="h-full w-full bg-cyan-400/70"
          />
        </div>
        <span>{timecode}</span>
      </div>

      <section
        className={`relative w-full overflow-hidden bg-[#06070a] ${
          isExplored
            ? "fixed inset-0 z-40 h-[100dvh]"
            : "min-h-[100svh] h-[100dvh]"
        }`}
      >
        {/* Subtle projector radial aura */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(56,189,248,0.12),rgba(245,158,11,0.05)_35%,transparent_70%)]"
        />

        {/* Top Chrome Bar */}
        <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 pt-[max(0.85rem,env(safe-area-inset-top))] pb-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="size-8 rounded-full border border-white/15 bg-white/5 flex items-center justify-center shrink-0">
              <span className="size-2 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b]" />
            </div>
            <div>
              <span className="font-serif text-xl tracking-tight text-white">
                KINEMA
              </span>
              <span className="hidden md:inline-block ml-2.5 text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                Cinema Atlas
              </span>
            </div>
          </div>

          <Tooltip.Provider delay={350}>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setCommandOpen(true)}
                className="KINEMA-press KINEMA-glass flex items-center gap-2 rounded-full px-3 sm:px-3.5 py-2 text-xs text-zinc-200 hover:text-white min-h-[38px]"
                aria-label="Search titles, actors, directors or commands"
              >
                <Search className="size-3.5 text-cyan-400" />
                <span className="hidden sm:inline">
                  Search titles, actors, directors
                </span>
                <span className="sm:hidden">Search</span>
                <kbd className="hidden lg:inline-block rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                  ⌘K
                </kbd>
              </button>

              <Tooltip.Root>
                <Tooltip.Trigger
                  onClick={() => setOttRadarOpen(true)}
                  aria-label="OTT Streaming Radar"
                  className="KINEMA-press KINEMA-glass relative flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-emerald-300 min-h-[38px]"
                >
                  <Radio className="size-3.5" />
                  <span className="hidden md:inline">OTT Radar</span>
                  {ottAlertCount > 0 && (
                    <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  )}
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner sideOffset={8}>
                    <Tooltip.Popup className="KINEMA-tooltip z-50 rounded-lg bg-[#141824] border border-white/12 px-2.5 py-1.5 text-[11px] text-zinc-200 shadow-xl">
                      Check Watchlist OTT releases
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>

              <Tooltip.Root>
                <Tooltip.Trigger
                  onClick={() => openRandomizer("spin")}
                  aria-label="Open Randomizer Suite"
                  className="KINEMA-press KINEMA-glass flex items-center gap-1.5 rounded-full px-3 sm:px-3.5 py-2 text-xs font-medium text-amber-300 hover:text-amber-200 min-h-[38px]"
                >
                  <Shuffle className="size-3.5" />
                  <span className="hidden sm:inline">Randomizer</span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner sideOffset={8}>
                    <Tooltip.Popup className="KINEMA-tooltip z-50 rounded-lg bg-[#141824] border border-white/12 px-2.5 py-1.5 text-[11px] text-zinc-200 shadow-xl">
                      4 ways to pick tonight’s watch
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>

              <Tooltip.Root>
                <Tooltip.Trigger
                  onClick={() => setExplored(!isExplored)}
                  aria-label={
                    isExplored ? "Exit Hologram" : "Step Inside Globe"
                  }
                  className={`KINEMA-press flex items-center gap-1.5 rounded-full px-3 sm:px-3.5 py-2 text-xs font-medium min-h-[38px] border ${
                    isExplored
                      ? "bg-cyan-400/20 border-cyan-400/50 text-cyan-200"
                      : "KINEMA-glass text-cyan-300 border-cyan-400/25 hover:border-cyan-400/50"
                  }`}
                >
                  {isExplored ? (
                    <Minimize2 className="size-3.5" />
                  ) : (
                    <Maximize2 className="size-3.5" />
                  )}
                  <span className="hidden xs:inline sm:inline">
                    {isExplored ? "Exit Core" : "Step Inside"}
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner sideOffset={8}>
                    <Tooltip.Popup className="KINEMA-tooltip z-50 rounded-lg bg-[#141824] border border-white/12 px-2.5 py-1.5 text-[11px] text-zinc-200 shadow-xl">
                      {isExplored
                        ? "Return outside the sphere (Esc)"
                        : "Enter 360° holographic projection"}
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </Tooltip.Provider>
        </header>

        {/* Mobile headline vignette for crisp readability */}
        {!isExplored && (
          <div
            aria-hidden="true"
            className="pointer-events-none sm:hidden absolute top-0 inset-x-0 h-56 z-10 bg-gradient-to-b from-[#06070a]/95 via-[#06070a]/75 to-transparent"
          />
        )}

        {/* Stark HUD Frame Overlay in Explore Mode */}
        <AnimatePresence>
          {isExplored && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute inset-0 z-10 border border-cyan-400/15 m-3 sm:m-6 rounded-3xl"
            >
              <div className="flex justify-between px-5 pt-16 text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-300/70 tabular-nums">
                <span>CORE PROJECTION · 000° / 360°</span>
                <span>{cosmosNodes.length} ORBITING TITLES</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Reticle during Spin & Lock */}
        <AnimatePresence>
          {showReticle && !isExplored && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            >
              <div className="relative flex items-center justify-center">
                <div
                  className={`size-48 sm:size-60 rounded-full border transition-colors duration-300 ${
                    spinWinnerNode
                      ? "border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.35)]"
                      : "border-cyan-400/60 shadow-[0_0_40px_rgba(56,189,248,0.25)]"
                  }`}
                />
                <Crosshair
                  className={`absolute size-8 ${
                    spinWinnerNode ? "text-amber-400" : "text-cyan-300/80"
                  }`}
                />
                <span className="absolute -bottom-8 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300 bg-black/70 px-3 py-1 rounded-full border border-white/10">
                  {spinWinnerNode ? "TARGET LOCKED" : "SPINNING UNIVERSE…"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The 3D Poster Globe Canvas */}
        <div className="absolute inset-0 px-3 sm:px-0">
          <CosmosScene
            nodes={cosmosNodes}
            lens={lens}
            isExplored={isExplored}
            spinTriggerCount={spinTriggerCount}
            spinCategoryFilter={spinCategoryFilter}
            spinIncludeRewatches={spinIncludeRewatches}
            onSelectNode={(node) => {
              setSpinWinnerNode(null);
              setFocusedNode(node);
            }}
            onSpinWinner={(winner) => {
              setSpinWinnerNode(winner);
              setFocusedNode(winner);
              setTimeout(() => setShowReticle(false), 1800);
            }}
          />
        </div>

        {/* Floating Editorial Headline */}
        {!isExplored && (
          <div
            style={{ opacity: heroChromeOpacity }}
            className="pointer-events-none absolute top-16 sm:top-24 left-4 sm:left-8 right-4 sm:right-auto z-10 max-w-sm"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber-400/95 mb-1 tabular-nums">
              {entries.length} LOGGED · {cosmosNodes.length} IN ORBIT
            </p>
            <h1 className="font-serif text-3xl sm:text-5xl leading-[1.02] tracking-tight text-white">
              Your life in cinema,{" "}
              <span className="italic text-zinc-300">in orbit.</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xs">
              Hover to ripple the cosmos. Drag to spin across films, series,
              anime & dramas.
            </p>
            <div className="pointer-events-auto mt-3 flex items-center gap-2">
              <button
                onClick={() => triggerGlobeSpin("all", false)}
                className="KINEMA-press KINEMA-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-amber-300 border-amber-400/30"
              >
                <Orbit className="size-3.5" />
                Spin Globe
              </button>
              <button
                onClick={shuffleCosmos}
                disabled={loadingCosmos}
                className="KINEMA-press KINEMA-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-zinc-300 hover:text-white"
              >
                <RefreshCw
                  className={`size-3 ${loadingCosmos ? "animate-spin" : ""}`}
                />
                Shuffle Feed
              </button>
            </div>
          </div>
        )}

        {/* Focused Poster OR Spin Winner Card */}
        <AnimatePresence>
          {focusedNode && (
            <motion.div
              key={focusedNode.key}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className={`KINEMA-glass absolute bottom-20 sm:bottom-24 right-4 sm:right-8 left-4 sm:left-auto z-20 sm:w-84 rounded-2xl p-3.5 ${
                spinWinnerNode?.key === focusedNode.key
                  ? "border-amber-400/50 shadow-[0_0_40px_rgba(245,158,11,0.2)]"
                  : ""
              }`}
            >
              {spinWinnerNode?.key === focusedNode.key && (
                <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400">
                  <span>✦ GLOBE PICK TONIGHT</span>
                  <button
                    onClick={() =>
                      triggerGlobeSpin(spinCategoryFilter, spinIncludeRewatches)
                    }
                    className="underline hover:text-amber-200"
                  >
                    Spin Again
                  </button>
                </div>
              )}
              <div className="flex gap-3.5">
                <PosterImage
                  posterPath={focusedNode.posterPath}
                  title={focusedNode.title}
                  category={focusedNode.category}
                  size="w500"
                  className="w-16 h-24 rounded-lg shrink-0"
                />
                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                        {formatCategoryLabel(focusedNode.category)}
                      </span>
                      <button
                        onClick={() => {
                          setFocusedNode(null);
                          setSpinWinnerNode(null);
                        }}
                        className="text-xs text-zinc-400 hover:text-white px-1"
                        aria-label="Close preview"
                      >
                        ✕
                      </button>
                    </div>
                    <h2 className="font-serif text-lg leading-tight text-white truncate mt-0.5">
                      {focusedNode.title}
                    </h2>
                    <p className="font-mono text-[11px] text-zinc-400 tabular-nums mt-0.5">
                      {focusedNode.releaseYear} · ★{" "}
                      {focusedNode.voteAverage || "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() =>
                        openDossier(focusedNode.tmdbType, focusedNode.tmdbId, {
                          title: focusedNode.title,
                          category: focusedNode.category,
                          posterPath: focusedNode.posterPath,
                          releaseYear: focusedNode.releaseYear,
                          voteAverage: focusedNode.voteAverage,
                        })
                      }
                      className="KINEMA-press flex-1 rounded-lg bg-white text-black px-3 py-1.5 text-xs font-medium hover:bg-zinc-200"
                    >
                      {focusedNode.diary ? "Edit Entry" : "Open & Log"}
                    </button>
                    <button
                      onClick={() => setCommandOpen(true)}
                      className="KINEMA-press rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
                      aria-label="Search more"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Lens Bar (fades cleanly as user scrolls so it never collides with Diary) */}
        <div
          style={{
            opacity: isExplored ? 1 : heroChromeOpacity,
            pointerEvents:
              !isExplored && heroChromeOpacity < 0.25 ? "none" : undefined,
          }}
          className="absolute bottom-4 sm:bottom-6 inset-x-0 z-20 px-4 sm:px-8 pb-[env(safe-area-inset-bottom)] flex flex-col sm:flex-row items-center justify-between gap-2.5 pointer-events-none"
        >
          <div className="pointer-events-auto KINEMA-glass no-scrollbar flex items-center gap-1 rounded-full p-1 max-w-full overflow-x-auto">
            {LENSES.map((item) => {
              const active = lens === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setLens(item.id)}
                  className={`KINEMA-press whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                    active
                      ? "bg-white text-black"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {!isExplored && (
            <a
              href="#diary"
              className="pointer-events-auto KINEMA-press KINEMA-glass flex items-center gap-2 rounded-full px-3.5 py-2 text-xs text-zinc-200 hover:text-white"
            >
              <span>Journal</span>
              <ArrowDown className="size-3.5 text-amber-400" />
            </a>
          )}
        </div>
      </section>

      {/* Corner Orbital Mini-Dock when scrolled down */}
      <AnimatePresence>
        {scrolledPast && !isExplored && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="fixed bottom-5 right-4 sm:right-6 z-30 pb-[env(safe-area-inset-bottom)] flex items-center gap-2"
          >
            <button
              onClick={() => openRandomizer("spin")}
              className="KINEMA-press KINEMA-glass flex items-center gap-1.5 rounded-full px-3 py-2.5 text-xs text-amber-300"
            >
              <Sparkles className="size-3.5" />
              <span className="hidden sm:inline">Spin</span>
            </button>
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => setExplored(true), 250);
              }}
              className="KINEMA-press KINEMA-glass flex items-center gap-2 rounded-full pl-2.5 pr-3.5 py-2 text-xs text-cyan-200 border-cyan-400/30"
            >
              <span className="size-6 rounded-full bg-radial from-cyan-400/40 to-[#0d1017] border border-cyan-400/50 flex items-center justify-center">
                <Compass className="size-3.5 text-cyan-300 animate-spin [animation-duration:12s]" />
              </span>
              <span>Sphere</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
