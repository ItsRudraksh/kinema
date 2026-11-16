"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { GitBranch, Orbit, RefreshCw, Search, User, X } from "lucide-react";
import { useOrbisStore } from "@/store/useOrbisStore";
import { formatCategoryLabel } from "@/lib/classify";
import { fetchJsonWithRetry } from "@/lib/fetchWithRetry";
import { PosterImage } from "./PosterImage";
import { OrbisSwitch } from "./ui/OrbisControls";
import type {
  CreditDepartment,
  PersonConstellation,
  PersonCreditNode,
} from "@/lib/types";

type GraphMode = "constellation" | "tree";
type DeptFilter = "all" | CreditDepartment;

const DEPT_ORDER: CreditDepartment[] = [
  "Acting",
  "Directing",
  "Production",
  "Writing",
  "Crew",
];

export function PersonConstellationModal() {
  const { personTargetId, closePerson, entries, openDossier } = useOrbisStore();
  const [person, setPerson] = useState<PersonConstellation | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<GraphMode>("constellation");
  const [roleFilter, setRoleFilter] = useState<DeptFilter>("all");
  const [hideTalkArchive, setHideTalkArchive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadPerson = useCallback(async () => {
    if (!personTargetId) return;
    setLoading(true);
    setFailed(false);
    try {
      const data = await fetchJsonWithRetry<{ person: PersonConstellation }>(
        `/api/tmdb/person/${personTargetId}`,
        {},
        3,
      );
      setPerson(data.person);
      setRoleFilter("all");
      setSearchQuery("");
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [personTargetId]);

  useEffect(() => {
    if (!personTargetId) {
      setPerson(null);
      return;
    }
    void loadPerson();
  }, [personTargetId, loadPerson]);

  const entryMap = useMemo(
    () => new Map(entries.map((e) => [e.key, e])),
    [entries],
  );

  const baseCredits = useMemo(() => {
    if (!person) return [];
    const q = searchQuery.trim().toLowerCase();
    return person.credits.filter((c) => {
      if (hideTalkArchive && c.isTalkOrArchive) return false;
      if (
        q &&
        !c.title.toLowerCase().includes(q) &&
        !c.roles.some((r) => r.toLowerCase().includes(q)) &&
        !c.releaseYear.includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [person, hideTalkArchive, searchQuery]);

  const deptCounts = useMemo(() => {
    const counts = new Map<CreditDepartment, number>();
    for (const d of DEPT_ORDER) counts.set(d, 0);
    for (const c of baseCredits) {
      for (const d of c.departments) {
        counts.set(d, (counts.get(d) ?? 0) + 1);
      }
    }
    return counts;
  }, [baseCredits]);

  const filteredCredits = useMemo(() => {
    if (roleFilter === "all") return baseCredits;
    return baseCredits.filter((c) => c.departments.includes(roleFilter));
  }, [baseCredits, roleFilter]);

  const seenCount = useMemo(
    () =>
      filteredCredits.filter((c) => {
        const e = entryMap.get(c.key);
        return e && e.status !== "watchlist";
      }).length,
    [filteredCredits, entryMap],
  );

  const orbitNodes = useMemo(() => {
    const sample = [...filteredCredits]
      .sort((a, b) => {
        const aLogged = entryMap.has(a.key) ? 1 : 0;
        const bLogged = entryMap.has(b.key) ? 1 : 0;
        if (aLogged !== bLogged) return bLogged - aLogged;
        return b.popularity - a.popularity;
      })
      .slice(0, 22);

    return sample.map((credit, idx) => {
      const ring = idx < 8 ? 1 : 2;
      const ringCount =
        ring === 1 ? Math.min(8, sample.length) : sample.length - 8;
      const idxInRing = ring === 1 ? idx : idx - 8;
      const angle =
        (idxInRing / Math.max(ringCount, 1)) * Math.PI * 2 - Math.PI / 2;
      const radiusX = ring === 1 ? 23 : 39;
      const radiusY = ring === 1 ? 22 : 36;
      return {
        credit,
        x: 50 + Math.cos(angle) * radiusX,
        y: 50 + Math.sin(angle) * radiusY,
      };
    });
  }, [filteredCredits, entryMap]);

  const groupedByYear = useMemo(() => {
    const groups = new Map<string, PersonCreditNode[]>();
    for (const c of filteredCredits) {
      const bucket = c.isUpcoming ? "Upcoming / TBA" : c.releaseYear || "TBA";
      const arr = groups.get(bucket) ?? [];
      arr.push(c);
      groups.set(bucket, arr);
    }
    return Array.from(groups.entries());
  }, [filteredCredits]);

  function openCredit(c: PersonCreditNode) {
    closePerson();
    openDossier(c.tmdbType, c.tmdbId, {
      title: c.title,
      category: c.category,
      posterPath: c.posterPath,
      releaseYear: c.releaseYear,
      voteAverage: c.voteAverage,
    });
  }

  return (
    <Dialog.Root
      open={Boolean(personTargetId)}
      onOpenChange={(open) => !open && closePerson()}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="orbis-dialog-backdrop fixed inset-0 z-50 bg-black/80 backdrop-blur-md" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <Dialog.Popup className="orbis-dialog-popup orbis-glass w-full max-w-4xl h-[90dvh] rounded-3xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4 sm:p-5 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="size-12 rounded-full overflow-hidden border border-amber-400/40 bg-white/5 flex items-center justify-center shrink-0">
                  {person?.profilePath ? (
                    <img
                      src={`/api/poster?path=${encodeURIComponent(person.profilePath)}&size=w185`}
                      alt={person.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="size-5 text-zinc-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400">
                    Talent Constellation · {person?.department ?? "Filmography"}
                  </p>
                  <Dialog.Title className="font-serif text-2xl sm:text-3xl text-white truncate">
                    {person?.name ?? "Mapping Constellation…"}
                  </Dialog.Title>
                  {person && (
                    <p className="font-mono text-[11px] text-zinc-400 tabular-nums">
                      Watched{" "}
                      <span className="text-emerald-300 font-semibold">
                        {seenCount}
                      </span>{" "}
                      of{" "}
                      <span className="text-white font-semibold">
                        {filteredCredits.length}
                      </span>{" "}
                      credited works
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-full border border-white/10 bg-black/50 p-1">
                  <button
                    onClick={() => setMode("constellation")}
                    className={`orbis-press flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
                      mode === "constellation"
                        ? "bg-cyan-400 text-black font-medium"
                        : "text-zinc-300"
                    }`}
                  >
                    <Orbit className="size-3.5" />
                    Orbit
                  </button>
                  <button
                    onClick={() => setMode("tree")}
                    className={`orbis-press flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
                      mode === "tree"
                        ? "bg-amber-400 text-black font-medium"
                        : "text-zinc-300"
                    }`}
                  >
                    <GitBranch className="size-3.5" />
                    Timeline ({filteredCredits.length})
                  </button>
                </div>

                <Dialog.Close className="orbis-press rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white">
                  <X className="size-4" />
                </Dialog.Close>
              </div>
            </div>

            {/* Department Pills + Search + Orbit Note */}
            <div className="flex flex-col gap-2.5 px-4 sm:px-5 py-3 border-b border-white/5 bg-black/30 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setRoleFilter("all")}
                    className={`orbis-press rounded-full px-3 py-1 text-xs border tabular-nums ${
                      roleFilter === "all"
                        ? "border-white bg-white text-black font-medium"
                        : "border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    All ({baseCredits.length})
                  </button>
                  {DEPT_ORDER.map((dept) => {
                    const count = deptCounts.get(dept) ?? 0;
                    if (count === 0) return null;
                    return (
                      <button
                        key={dept}
                        onClick={() => setRoleFilter(dept)}
                        className={`orbis-press rounded-full px-3 py-1 text-xs border tabular-nums ${
                          roleFilter === dept
                            ? "border-white bg-white text-black font-medium"
                            : "border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {dept} ({count})
                      </button>
                    );
                  })}
                </div>

                <OrbisSwitch
                  checked={hideTalkArchive}
                  onCheckedChange={setHideTalkArchive}
                  label="Hide Talk Shows & Archive"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="size-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by title, character, or year…"
                    className="w-full rounded-xl bg-black/45 border border-white/10 pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400/50"
                  />
                </div>

                {mode === "constellation" && filteredCredits.length > 22 && (
                  <button
                    onClick={() => setMode("tree")}
                    className="orbis-press rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-mono text-amber-200 hover:bg-amber-400/20"
                  >
                    Top 22 in Orbit · Open all {filteredCredits.length} →
                  </button>
                )}

                <div className="hidden sm:flex items-center gap-3 font-mono text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-amber-400" />{" "}
                    Watched
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-cyan-400" />{" "}
                    Watchlist
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-zinc-600" /> Unseen
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div
              className={`flex-1 relative ${
                mode === "constellation" ? "overflow-hidden" : "overflow-y-auto"
              }`}
            >
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="size-40 rounded-full border border-cyan-400/20 animate-ping" />
                </div>
              ) : failed ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-sm text-zinc-300">
                    Could not load filmography after 3 automatic tries.
                  </p>
                  <button
                    onClick={() => void loadPerson()}
                    className="orbis-press inline-flex items-center gap-1.5 rounded-full bg-white text-black px-4 py-2 text-xs font-semibold"
                  >
                    <RefreshCw className="size-3.5" />
                    Retry
                  </button>
                </div>
              ) : filteredCredits.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-zinc-500 p-6">
                  No credits match this filter.
                </div>
              ) : mode === "constellation" ? (
                <div className="relative w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.08),transparent_65%)]">
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    <ellipse
                      cx="50"
                      cy="50"
                      rx="23"
                      ry="22"
                      fill="none"
                      stroke="rgba(255,255,255,0.07)"
                      strokeDasharray="0.8 0.8"
                    />
                    <ellipse
                      cx="50"
                      cy="50"
                      rx="39"
                      ry="36"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    {orbitNodes.map(({ credit, x, y }) => {
                      const e = entryMap.get(credit.key);
                      const stroke = !e
                        ? "rgba(255,255,255,0.08)"
                        : e.status === "watchlist"
                          ? "rgba(56,189,248,0.45)"
                          : "rgba(245,158,11,0.55)";
                      return (
                        <line
                          key={`line-${credit.key}`}
                          x1="50"
                          y1="50"
                          x2={x}
                          y2={y}
                          stroke={stroke}
                          strokeWidth={e ? "0.28" : "0.14"}
                        />
                      );
                    })}
                  </svg>

                  {/* Center Star Portrait */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                    <div className="size-14 sm:size-18 rounded-full overflow-hidden border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.35)] bg-[#0d1017]">
                      {person?.profilePath ? (
                        <img
                          src={`/api/poster?path=${encodeURIComponent(person.profilePath)}&size=w185`}
                          alt={person.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="size-8 m-auto mt-4 text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {/* Orbiting Poster Nodes */}
                  {orbitNodes.map(({ credit, x, y }) => {
                    const e = entryMap.get(credit.key);
                    const ringClass = !e
                      ? "border-white/15 opacity-80 hover:opacity-100"
                      : e.status === "watchlist"
                        ? "border-cyan-400 shadow-[0_0_16px_rgba(56,189,248,0.35)]"
                        : "border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.4)]";

                    return (
                      <button
                        key={credit.key}
                        onClick={() => openCredit(credit)}
                        style={{ left: `${x}%`, top: `${y}%` }}
                        className="orbis-press group -translate-x-1/2 -translate-y-1/2 absolute z-10 flex flex-col items-center"
                      >
                        <PosterImage
                          posterPath={credit.posterPath}
                          title={credit.title}
                          category={credit.category}
                          size="w185"
                          className={`w-9 h-13 sm:w-11 sm:h-16 rounded-lg border transition-transform group-hover:scale-115 ${ringClass}`}
                        />
                        <span className="mt-1 max-w-[90px] truncate rounded bg-black/85 px-1.5 py-0.5 text-[10px] text-zinc-200 border border-white/5">
                          {credit.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 sm:p-7">
                  <div className="relative border-l border-white/15 pl-6 space-y-6">
                    {groupedByYear.map(([bucket, items]) => {
                      const isUpcomingBucket = bucket === "Upcoming / TBA";
                      return (
                        <div key={bucket} className="relative">
                          <span
                            className={`absolute -left-[29px] top-1 size-2.5 rounded-full ring-4 ring-[#0d1017] ${
                              isUpcomingBucket
                                ? "bg-amber-400 shadow-[0_0_10px_#f59e0b]"
                                : "bg-cyan-400"
                            }`}
                          />
                          <p
                            className={`font-mono text-xs tabular-nums mb-2 ${
                              isUpcomingBucket
                                ? "text-amber-400 font-semibold uppercase tracking-wider"
                                : "text-cyan-300"
                            }`}
                          >
                            {bucket} · {items.length}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {items.map((c) => {
                              const logged = entryMap.get(c.key);
                              return (
                                <button
                                  key={c.key}
                                  onClick={() => openCredit(c)}
                                  className={`orbis-press flex items-center gap-3 rounded-xl border p-2.5 text-left ${
                                    logged
                                      ? "border-amber-400/35 bg-amber-400/10"
                                      : "border-white/10 bg-black/35 hover:border-white/25"
                                  }`}
                                >
                                  <PosterImage
                                    posterPath={c.posterPath}
                                    title={c.title}
                                    category={c.category}
                                    size="w185"
                                    className="w-11 h-16 rounded-lg shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-serif text-base text-white truncate">
                                      {c.title}
                                    </p>
                                    <p className="text-[11px] text-zinc-400 truncate">
                                      {formatCategoryLabel(c.category)} ·{" "}
                                      {c.roles.slice(0, 3).join(" / ")}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] tabular-nums">
                                      <span className="text-zinc-500">
                                        {c.departments.join(" + ")}
                                      </span>
                                      {c.voteAverage > 0 && (
                                        <span className="text-zinc-400">
                                          · ★ {c.voteAverage}
                                        </span>
                                      )}
                                      {c.episodeCount && (
                                        <span className="text-cyan-300/80">
                                          · {c.episodeCount} ep
                                        </span>
                                      )}
                                      {logged && (
                                        <span className="text-amber-300 font-semibold">
                                          ·{" "}
                                          {logged.rating
                                            ? `You: ${logged.rating}★`
                                            : logged.status}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
