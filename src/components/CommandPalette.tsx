"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Dialog } from "@base-ui/react/dialog";
import {
  Maximize2,
  Search,
  Shuffle,
  Sparkles,
  Tv,
  Film,
  Ticket,
  User,
  Radio,
} from "lucide-react";
import { useOrbisStore } from "@/store/useOrbisStore";
import { formatCategoryLabel } from "@/lib/classify";
import { fetchJsonWithRetry } from "@/lib/fetchWithRetry";
import { PosterImage } from "./PosterImage";
import type { CosmosNode, PersonSearchHit } from "@/lib/types";

export function CommandPalette() {
  const {
    commandOpen,
    setCommandOpen,
    entries,
    openDossier,
    openPerson,
    setOttRadarOpen,
    setExplored,
    openRandomizer,
    triggerGlobeSpin,
  } = useOrbisStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CosmosNode[]>([]);
  const [people, setPeople] = useState<PersonSearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen, setCommandOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setPeople([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await fetchJsonWithRetry<{
          results: CosmosNode[];
          people?: PersonSearchHit[];
        }>(`/api/tmdb/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        setResults(data.results || []);
        setPeople(data.people || []);
      } catch {
        // aborted or exhausted retries
      } finally {
        setSearching(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <Dialog.Root open={commandOpen} onOpenChange={setCommandOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
          <Dialog.Popup className="orbis-glass w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl">
            <Dialog.Title className="sr-only">
              Search TMDB titles, actors, directors and actions
            </Dialog.Title>
            <Command shouldFilter={false} className="flex flex-col">
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                <Search className="size-4 text-cyan-400 shrink-0" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search films, series, anime, Robert Pattinson, Nolan…"
                  className="w-full bg-transparent text-base text-white placeholder:text-zinc-500 focus:outline-none"
                />
                {searching && (
                  <span className="font-mono text-[10px] text-cyan-300">
                    TMDB…
                  </span>
                )}
              </div>

              <Command.List className="max-h-[60vh] overflow-y-auto p-2 space-y-2">
                {query.trim() && people.length > 0 && (
                  <Command.Group
                    heading="Actors & Directors (Open Constellation)"
                    className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-amber-400"
                  >
                    {people.map((p) => (
                      <Command.Item
                        key={`person-${p.id}`}
                        value={`person-${p.id}`}
                        onSelect={() => {
                          setQuery("");
                          openPerson(p.id);
                        }}
                        className="mt-1 flex items-center gap-3 rounded-xl px-2.5 py-2 text-left cursor-pointer aria-selected:bg-white/10"
                      >
                        <div className="size-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                          {p.profilePath ? (
                            <img
                              src={`/api/poster?path=${encodeURIComponent(p.profilePath)}&size=w185`}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="size-4 text-zinc-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">
                            {p.name}
                          </p>
                          <p className="text-xs text-zinc-400 truncate">
                            {p.department}
                            {p.knownForTitles.length
                              ? ` · ${p.knownForTitles.join(", ")}`
                              : ""}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300 shrink-0">
                          Constellation →
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {query.trim() && results.length > 0 && (
                  <Command.Group
                    heading="Titles"
                    className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-zinc-400"
                  >
                    {results.map((item) => (
                      <Command.Item
                        key={item.key}
                        value={item.key}
                        onSelect={() => {
                          setQuery("");
                          openDossier(item.tmdbType, item.tmdbId, {
                            title: item.title,
                            category: item.category,
                            posterPath: item.posterPath,
                            releaseYear: item.releaseYear,
                            voteAverage: item.voteAverage,
                          });
                        }}
                        className="mt-1 flex items-center gap-3 rounded-xl px-2.5 py-2 text-left cursor-pointer aria-selected:bg-white/10"
                      >
                        <PosterImage
                          posterPath={item.posterPath}
                          title={item.title}
                          category={item.category}
                          size="w185"
                          className="w-9 h-13 rounded shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-zinc-400 font-mono tabular-nums">
                            {formatCategoryLabel(item.category)} ·{" "}
                            {item.releaseYear} · ★ {item.voteAverage || "—"}
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                          {item.tmdbType === "tv" ? (
                            <Tv className="size-3.5" />
                          ) : (
                            <Film className="size-3.5" />
                          )}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {!query.trim() && entries.length > 0 && (
                  <Command.Group
                    heading="Recent in Your Diary"
                    className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-zinc-400"
                  >
                    {entries.slice(0, 5).map((e) => (
                      <Command.Item
                        key={e.key}
                        value={e.key}
                        onSelect={() =>
                          openDossier(e.tmdbType, e.tmdbId, {
                            title: e.title,
                            category: e.category,
                            posterPath: e.posterPath,
                            releaseYear: e.releaseYear,
                          })
                        }
                        className="mt-1 flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer aria-selected:bg-white/10"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">
                            {e.title}
                          </p>
                          <p className="text-[11px] font-mono text-zinc-400">
                            {formatCategoryLabel(e.category)} ·{" "}
                            {e.status.replace("_", " ")}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-amber-400 tabular-nums">
                          {e.rating ? `${e.rating} ★` : "—"}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                <Command.Group
                  heading="Cosmos Actions"
                  className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-zinc-400"
                >
                  <Command.Item
                    onSelect={() => {
                      setCommandOpen(false);
                      window.scrollTo({ top: 0 });
                      setExplored(true);
                    }}
                    className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-200 cursor-pointer aria-selected:bg-white/10"
                  >
                    <Maximize2 className="size-4 text-cyan-400" />
                    <span>Step Inside Hologram (360° Mode)</span>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => triggerGlobeSpin("all", false)}
                    className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-200 cursor-pointer aria-selected:bg-white/10"
                  >
                    <Shuffle className="size-4 text-amber-400" />
                    <span>Spin & Lock Unwatched Globe Pick</span>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => {
                      setCommandOpen(false);
                      setOttRadarOpen(true);
                    }}
                    className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-200 cursor-pointer aria-selected:bg-white/10"
                  >
                    <Radio className="size-4 text-emerald-400" />
                    <span>Scan Watchlist OTT Releases</span>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => openRandomizer("roulette")}
                    className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-200 cursor-pointer aria-selected:bg-white/10"
                  >
                    <Sparkles className="size-4 text-cyan-300" />
                    <span>Open 35mm Time-Commitment Roulette</span>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => openRandomizer("ticket")}
                    className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-200 cursor-pointer aria-selected:bg-white/10"
                  >
                    <Ticket className="size-4 text-emerald-400" />
                    <span>Print Mystery Screening Ticket</span>
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
