"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Globe, Radio, RefreshCw, Sparkles, X } from "lucide-react";
import { useOrbisStore } from "@/store/useOrbisStore";
import { PosterImage } from "./PosterImage";

export function OttRadarModal() {
  const {
    ottRadarOpen,
    setOttRadarOpen,
    ottItems,
    ottLoading,
    fetchOttRadar,
    region,
    openDossier,
  } = useOrbisStore();

  const streamingLocal = ottItems.filter((i) => i.flatrate.length > 0);
  const rentLocal = ottItems.filter(
    (i) => i.flatrate.length === 0 && i.rent.length > 0,
  );
  const globalOrUnreleased = ottItems.filter(
    (i) => i.flatrate.length === 0 && i.rent.length === 0,
  );

  return (
    <Dialog.Root open={ottRadarOpen} onOpenChange={setOttRadarOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="orbis-dialog-backdrop fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="orbis-dialog-popup orbis-glass w-full max-w-2xl max-h-[86dvh] rounded-3xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400">
                  <Radio className="size-3.5" />
                  Watchlist Streaming Radar · {region}
                </span>
                <Dialog.Title className="font-serif text-2xl sm:text-3xl text-white mt-0.5">
                  OTT Availability Tracker
                </Dialog.Title>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void fetchOttRadar()}
                  disabled={ottLoading}
                  className="orbis-press rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-200 flex items-center gap-1.5"
                >
                  <RefreshCw
                    className={`size-3.5 ${ottLoading ? "animate-spin" : ""}`}
                  />
                  Scan Now
                </button>
                <Dialog.Close className="orbis-press rounded-full p-2 text-zinc-400 hover:text-white">
                  <X className="size-4" />
                </Dialog.Close>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {ottItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-400">
                  Your Watchlist is currently empty. Add upcoming or queued
                  titles to Watchlist and ORBIS will track when they land on OTT
                  in {region} (or abroad).
                </div>
              ) : (
                <>
                  {/* Streaming Now in Region */}
                  <div className="space-y-3">
                    <h3 className="font-mono text-[11px] uppercase tracking-widest text-emerald-400">
                      Streaming Now in {region} ({streamingLocal.length})
                    </h3>
                    {streamingLocal.length === 0 ? (
                      <p className="text-xs text-zinc-500">
                        None of your Watchlist items are on subscription OTT in{" "}
                        {region} yet.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {streamingLocal.map((item) => (
                          <button
                            key={item.entry.key}
                            onClick={() => {
                              setOttRadarOpen(false);
                              openDossier(
                                item.entry.tmdbType,
                                item.entry.tmdbId,
                                {
                                  title: item.entry.title,
                                  category: item.entry.category,
                                  posterPath: item.entry.posterPath,
                                  releaseYear: item.entry.releaseYear,
                                },
                              );
                            }}
                            className="orbis-press w-full flex items-center gap-3.5 rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-3 text-left"
                          >
                            <PosterImage
                              posterPath={item.entry.posterPath}
                              title={item.entry.title}
                              category={item.entry.category}
                              size="w185"
                              className="w-12 h-18 rounded-lg shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-serif text-lg text-white truncate">
                                  {item.entry.title}
                                </p>
                                {item.newlyAvailable && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400 text-black px-2 py-0.5 font-mono text-[9px] font-bold">
                                    <Sparkles className="size-2.5" />
                                    OTT LIVE
                                  </span>
                                )}
                              </div>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {item.flatrate.map((p) => (
                                  <span
                                    key={p.provider_id}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-black/50 border border-white/10 px-2 py-1 text-[11px] text-zinc-200"
                                  >
                                    <img
                                      src={`/api/poster?path=${encodeURIComponent(p.logo_path)}&size=w185`}
                                      alt=""
                                      className="size-4 rounded"
                                    />
                                    {p.provider_name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rent / Buy */}
                  {rentLocal.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="font-mono text-[11px] uppercase tracking-widest text-amber-400">
                        Digital Rent / Buy Only in {region} ({rentLocal.length})
                      </h3>
                      {rentLocal.map((item) => (
                        <div
                          key={item.entry.key}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs"
                        >
                          <span className="text-white font-medium">
                            {item.entry.title}
                          </span>
                          <span className="text-amber-300">
                            {item.rent.map((r) => r.provider_name).join(", ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Not yet in IN -> Global Status */}
                  {globalOrUnreleased.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
                        Not Yet on OTT in {region} ({globalOrUnreleased.length})
                      </h3>
                      {globalOrUnreleased.map((item) => (
                        <div
                          key={item.entry.key}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/35 px-3.5 py-2.5 text-xs"
                        >
                          <span className="text-zinc-200 font-medium">
                            {item.entry.title}
                          </span>
                          {item.globalFallback ? (
                            <span className="inline-flex items-center gap-1.5 text-cyan-300">
                              <Globe className="size-3.5" />
                              Streaming in {item.globalFallback.region}:{" "}
                              {item.globalFallback.providers
                                .map((p) => p.provider_name)
                                .join(", ")}
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] text-zinc-500">
                              Theatrical / No OTT release yet
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              <p className="font-mono text-[10px] text-zinc-500 pt-2 border-t border-white/10">
                Streaming provider data powered by JustWatch via TMDB.
              </p>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
