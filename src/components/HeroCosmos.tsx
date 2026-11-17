"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
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
    setHeroChromeOpacity(Math.max(0, 1 - y / 280));
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setScrolledPast(latest > 0.18);
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

  const watchlistKeys = new Set(
    entries.filter((e) => e.status === "watchlist").map((e) => e.key),
  );
  const ottAlertCount = ottItems.filter(
    (i) => watchlistKeys.has(i.entry.key) && i.flatrate.length > 0,
  ).length;

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
        className={`relative w-full overflow-hidden bg-[#06070a] flex flex-col justify-between ${
          isExplored
            ? "fixed inset-0 z-40 h-[100dvh]"
            : "min-h-[100svh] sm:h-[100dvh]"
        }`}
      >
        {/* Subtle projector radial aura */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_54%,rgba(56,189,248,0.12),rgba(245,158,11,0.05)_35%,transparent_70%)]"
        />

        {/* Top Scrim + Chrome Bar (Fits 360px Galaxy S24 with zero right-edge clipping) */}
        <div className="relative z-20 bg-gradient-to-b from-[#06070a]/95 via-[#06070a]/70 to-transparent touch-pan-y">
          <header className="flex items-center justify-between gap-2 px-3 sm:px-8 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
              <img
                src="/brand/kinema-mark.svg"
                alt="Kinema"
                className="size-7 sm:size-8 shrink-0"
              />
              <div className="truncate">
                <span className="font-serif text-lg sm:text-xl tracking-wide text-white">
                  KINEMA
                </span>
                <span className="hidden md:inline-block ml-2.5 text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                  Cinema Atlas
                </span>
              </div>
            </div>

            <Tooltip.Provider delay={350}>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => setCommandOpen(true)}
                  className="orbis-press orbis-glass flex items-center justify-center gap-1.5 rounded-full px-2.5 sm:px-3.5 h-9 text-xs text-zinc-200 hover:text-white"
                  aria-label="Search titles, actors, directors or commands"
                >
                  <Search className="size-3.5 text-cyan-400 shrink-0" />
                  <span className="hidden sm:inline">
                    Search titles, actors, directors
                  </span>
                  <span className="text-[11px] sm:hidden">Search</span>
                  <kbd className="hidden lg:inline-block rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    ⌘K
                  </kbd>
                </button>

                <Tooltip.Root>
                  <Tooltip.Trigger
                    onClick={() => setOttRadarOpen(true)}
                    aria-label="OTT Streaming Radar"
                    className="orbis-press orbis-glass relative flex items-center justify-center gap-1.5 rounded-full size-9 md:w-auto md:px-3 text-xs text-emerald-300"
                  >
                    <Radio className="size-3.5 shrink-0" />
                    <span className="hidden md:inline">OTT Radar</span>
                    {ottAlertCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 md:static size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                    )}
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner sideOffset={8}>
                      <Tooltip.Popup className="orbis-tooltip z-50 rounded-lg bg-[#141824] border border-white/12 px-2.5 py-1.5 text-[11px] text-zinc-200 shadow-xl">
                        Check Watchlist OTT releases
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>

                <Tooltip.Root>
                  <Tooltip.Trigger
                    onClick={() => openRandomizer("spin")}
                    aria-label="Open Randomizer Suite"
                    className="orbis-press orbis-glass flex items-center justify-center gap-1.5 rounded-full size-9 sm:w-auto sm:px-3.5 text-xs font-medium text-amber-300 hover:text-amber-200"
                  >
                    <Shuffle className="size-3.5 shrink-0" />
                    <span className="hidden sm:inline">Randomizer</span>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner sideOffset={8}>
                      <Tooltip.Popup className="orbis-tooltip z-50 rounded-lg bg-[#141824] border border-white/12 px-2.5 py-1.5 text-[11px] text-zinc-200 shadow-xl">
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
                    className={`orbis-press flex items-center justify-center gap-1.5 rounded-full size-9 sm:w-auto sm:px-3.5 text-xs font-medium border ${
                      isExplored
                        ? "bg-cyan-400/20 border-cyan-400/50 text-cyan-200"
                        : "orbis-glass text-cyan-300 border-cyan-400/25 hover:border-cyan-400/50"
                    }`}
                  >
                    {isExplored ? (
                      <Minimize2 className="size-3.5 shrink-0" />
                    ) : (
                      <Maximize2 className="size-3.5 shrink-0" />
                    )}
                    <span className="hidden sm:inline">
                      {isExplored ? "Exit Core" : "Step Inside"}
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner sideOffset={8}>
                      <Tooltip.Popup className="orbis-tooltip z-50 rounded-lg bg-[#141824] border border-white/12 px-2.5 py-1.5 text-[11px] text-zinc-200 shadow-xl">
                        {isExplored
                          ? "Return outside the sphere (Esc)"
                          : "Enter 360° holographic projection"}
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>

                <Suspense fallback={null}>
                  <Show when="signed-out">
                    <SignInButton mode="modal">
                      <button className="orbis-press orbis-glass rounded-full px-3 h-9 text-xs font-medium text-white hover:border-white/30">
                        Sign In
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="orbis-press hidden sm:inline-flex items-center rounded-full bg-amber-400 text-black px-3.5 h-9 text-xs font-semibold">
                        Sign Up
                      </button>
                    </SignUpButton>
                  </Show>
                  <Show when="signed-in">
                    <div className="orbis-glass rounded-full p-0.5 flex items-center justify-center shrink-0">
                      <UserButton />
                    </div>
                  </Show>
                </Suspense>
              </div>
            </Tooltip.Provider>
          </header>

          {/* Editorial Headline Zone — Touch-scrollable on mobile so it never traps vertical page scrolling */}
          {!isExplored && (
            <div
              style={{ opacity: heroChromeOpacity }}
              className="px-4 sm:px-8 pt-1 pb-2 sm:pt-4 sm:pb-0 sm:max-w-sm touch-pan-y relative z-20"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400/95 mb-1 tabular-nums">
                {entries.length} LOGGED · {cosmosNodes.length} IN ORBIT
              </p>
              <h1 className="font-serif text-3xl sm:text-5xl leading-[1.03] tracking-tight text-white">
                Your life in cinema,{" "}
                <span className="italic text-zinc-300">in orbit.</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xs">
                Drag the globe to spin across films, series, anime & dramas.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={() => triggerGlobeSpin("all", false)}
                  className="orbis-press orbis-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-amber-300 border-amber-400/30"
                >
                  <Orbit className="size-3.5" />
                  Spin Globe
                </button>
                <button
                  onClick={shuffleCosmos}
                  disabled={loadingCosmos}
                  className="orbis-press orbis-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-zinc-300 hover:text-white"
                >
                  <RefreshCw
                    className={`size-3 ${loadingCosmos ? "animate-spin" : ""}`}
                  />
                  Shuffle Feed
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stark HUD Frame Overlay in Explore Mode */}
        <AnimatePresence>
          {isExplored && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute inset-0 z-10 border border-cyan-400/15 m-2.5 sm:m-6 rounded-3xl"
            >
              <div className="flex items-center justify-between gap-2 px-4 pt-14 sm:pt-16 text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80 tabular-nums bg-gradient-to-b from-[#06070a]/85 to-transparent pb-4 rounded-t-3xl">
                <span>CORE PROJECTION · 360°</span>
                <span>{cosmosNodes.length} ORBITING</span>
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
                  className={`size-44 sm:size-60 rounded-full border transition-colors duration-300 ${
                    spinWinnerNode
                      ? "border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.35)]"
                      : "border-cyan-400/60 shadow-[0_0_40px_rgba(56,189,248,0.25)]"
                  }`}
                />
                <Crosshair
                  className={`absolute size-7 sm:size-8 ${
                    spinWinnerNode ? "text-amber-400" : "text-cyan-300/80"
                  }`}
                />
                <span className="absolute -bottom-8 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-300 bg-black/80 px-3 py-1 rounded-full border border-white/10 whitespace-nowrap">
                  {spinWinnerNode ? "TARGET LOCKED" : "SPINNING UNIVERSE…"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The 3D Poster Globe Stage:
            On mobile: contained middle box with 24px scroll-safe side gutters so users can scroll the page easily!
            On desktop or Explore Mode: full stage. */}
        <div
          className={
            isExplored
              ? "absolute inset-0 z-0"
              : "relative sm:absolute sm:inset-0 z-0 h-[48svh] sm:h-full w-full px-6 sm:px-0 my-auto"
          }
        >
          {/* Left & Right Touch-Scroll Gutters on Mobile so edge swipes always scroll the page */}
          {!isExplored && (
            <>
              <div
                aria-hidden="true"
                className="sm:hidden absolute inset-y-0 left-0 w-6 z-10 touch-pan-y"
              />
              <div
                aria-hidden="true"
                className="sm:hidden absolute inset-y-0 right-0 w-6 z-10 touch-pan-y"
              />
            </>
          )}
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

        {/* Focused Poster OR Spin Winner Card */}
        <AnimatePresence>
          {focusedNode && (
            <motion.div
              key={focusedNode.key}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className={`orbis-glass absolute bottom-24 sm:bottom-24 right-3 sm:right-8 left-3 sm:left-auto z-30 sm:w-84 rounded-2xl p-3.5 ${
                spinWinnerNode?.key === focusedNode.key
                  ? "border-amber-400/50 shadow-[0_0_40px_rgba(245,158,11,0.25)]"
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
                      className="orbis-press flex-1 rounded-lg bg-white text-black px-3 py-1.5 text-xs font-medium hover:bg-zinc-200"
                    >
                      {focusedNode.diary ? "Edit Entry" : "Open & Log"}
                    </button>
                    <button
                      onClick={() => setCommandOpen(true)}
                      className="orbis-press rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
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

        {/* Bottom Lens Bar + Scroll Cue (Touch-scrollable zone on mobile) */}
        <div
          style={{
            opacity: isExplored ? 1 : heroChromeOpacity,
            pointerEvents:
              !isExplored && heroChromeOpacity < 0.25 ? "none" : undefined,
          }}
          className="relative z-20 px-3 sm:px-8 pt-2 pb-[max(0.85rem,env(safe-area-inset-bottom))] flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-gradient-to-t from-[#06070a] via-[#06070a]/80 to-transparent touch-pan-y"
        >
          <div className="orbis-glass no-scrollbar flex items-center gap-1 rounded-full p-1 max-w-full overflow-x-auto">
            {LENSES.map((item) => {
              const active = lens === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setLens(item.id)}
                  className={`orbis-press whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
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
              className="orbis-press orbis-glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-zinc-200 hover:text-white"
            >
              <span>Scroll to Journal</span>
              <ArrowDown className="size-3.5 text-amber-400" />
            </a>
          )}
        </div>
      </section>

      {/* Corner Orbital Mini-Dock when scrolled down (Solid frosted dark-glass pill!) */}
      <AnimatePresence>
        {scrolledPast && !isExplored && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="fixed bottom-4 right-3 sm:right-6 z-30 pb-[env(safe-area-inset-bottom)] flex items-center gap-1.5 orbis-glass rounded-full p-1.5"
          >
            <button
              onClick={() => openRandomizer("spin")}
              className="orbis-press flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/35 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-400/25"
            >
              <Sparkles className="size-3.5" />
              <span>Spin</span>
            </button>
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => setExplored(true), 250);
              }}
              className="orbis-press flex items-center gap-1.5 rounded-full bg-cyan-400/15 border border-cyan-400/35 pl-2 pr-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-400/25"
            >
              <span className="size-5 rounded-full bg-cyan-400/25 flex items-center justify-center">
                <Compass className="size-3 text-cyan-300 animate-spin [animation-duration:12s]" />
              </span>
              <span>Sphere</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
