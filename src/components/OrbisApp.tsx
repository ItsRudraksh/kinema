"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { MotionConfig } from "motion/react";
import { toast } from "sonner";
import { useOrbisStore } from "@/store/useOrbisStore";
import { HeroCosmos } from "./HeroCosmos";
import { DiarySection } from "./DiarySection";
import { CommandPalette } from "./CommandPalette";
import { RandomizerModal } from "./RandomizerModal";
import { DossierDrawer } from "./DossierDrawer";
import { PersonConstellationModal } from "./PersonConstellationModal";
import { OttRadarModal } from "./OttRadarModal";
import type { CosmosNode, DiaryEntry } from "@/lib/types";

interface OrbisAppProps {
  initialEntries: DiaryEntry[];
  initialCosmos: CosmosNode[];
  initialRegion: string;
  serverUserId?: string | null;
}

export function OrbisApp({
  initialEntries,
  initialCosmos,
  initialRegion,
  serverUserId,
}: OrbisAppProps) {
  const { userId, isLoaded } = useAuth();
  const hydrate = useOrbisStore((s) => s.hydrate);
  const fetchOttRadar = useOrbisStore((s) => s.fetchOttRadar);
  const syncedUserRef = useRef<string | null>(null);

  useEffect(() => {
    hydrate({
      entries: initialEntries,
      cosmosNodes: initialCosmos,
      region: initialRegion,
      // When signed in on the server, trust Neon Postgres directly
      replace: Boolean(serverUserId) && initialEntries.length > 0,
    });
  }, [hydrate, initialEntries, initialCosmos, initialRegion, serverUserId]);

  useEffect(() => {
    if (!isLoaded) return;

    // If user just signed out, clear cached local entries so accounts never mix
    if (!userId) {
      if (syncedUserRef.current) {
        syncedUserRef.current = null;
        hydrate({
          entries: [],
          cosmosNodes: initialCosmos,
          region: initialRegion,
          replace: true,
        });
      }
      return;
    }

    if (syncedUserRef.current === userId) return;
    syncedUserRef.current = userId;

    const syncCloud = async () => {
      try {
        const res = await fetch("/api/diary", { cache: "no-store" });
        if (!res.ok) return;
        const cloud = (await res.json()) as {
          entries: DiaryEntry[];
          region: string;
        };

        // Only auto-upload localStorage entries if this cloud account is brand new (0 entries)
        const localEntries = useOrbisStore.getState().entries;
        if (cloud.entries.length === 0 && localEntries.length > 0) {
          const upRes = await fetch("/api/diary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bulkEntries: localEntries }),
          });
          if (upRes.ok) {
            const merged = (await upRes.json()) as { entries: DiaryEntry[] };
            hydrate({
              entries: merged.entries,
              cosmosNodes: initialCosmos,
              region: cloud.region || initialRegion,
              replace: true,
            });
            toast.success(
              `Synced ${localEntries.length} local ${
                localEntries.length === 1 ? "title" : "titles"
              } to your cloud account`,
            );
            return;
          }
        }

        // Otherwise, Neon Postgres is the single source of truth across PC & Phone
        hydrate({
          entries: cloud.entries,
          cosmosNodes: initialCosmos,
          region: cloud.region || initialRegion,
          replace: true,
        });
      } catch {
        // offline fallback
      } finally {
        if (
          useOrbisStore.getState().entries.some((e) => e.status === "watchlist")
        ) {
          void fetchOttRadar();
        }
      }
    };

    void syncCloud();
  }, [isLoaded, userId, hydrate, fetchOttRadar, initialCosmos, initialRegion]);

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-[100dvh] bg-[#06070a] text-zinc-100">
        <HeroCosmos />
        <DiarySection />
        <CommandPalette />
        <RandomizerModal />
        <DossierDrawer />
        <PersonConstellationModal />
        <OttRadarModal />
      </main>
    </MotionConfig>
  );
}
