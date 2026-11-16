"use client";

import { useEffect } from "react";
import { MotionConfig } from "motion/react";
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
}

export function OrbisApp({
  initialEntries,
  initialCosmos,
  initialRegion,
}: OrbisAppProps) {
  const hydrate = useOrbisStore((s) => s.hydrate);
  const fetchOttRadar = useOrbisStore((s) => s.fetchOttRadar);

  useEffect(() => {
    hydrate({
      entries: initialEntries,
      cosmosNodes: initialCosmos,
      region: initialRegion,
    });
    if (initialEntries.some((e) => e.status === "watchlist")) {
      void fetchOttRadar();
    }
  }, [hydrate, fetchOttRadar, initialEntries, initialCosmos, initialRegion]);

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
