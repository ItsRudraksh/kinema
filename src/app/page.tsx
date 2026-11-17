import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getAllEntries, getUserRegion } from "@/lib/db";
import { fetchStarterCosmos } from "@/lib/tmdb";
import { OrbisApp } from "@/components/OrbisApp";

export const dynamic = "force-dynamic";

async function AuthenticatedAtlas() {
  const { userId } = await auth();
  const [entries, starter, region] = await Promise.all([
    getAllEntries(userId),
    fetchStarterCosmos(),
    getUserRegion(userId),
  ]);

  return (
    <OrbisApp
      initialEntries={entries}
      initialCosmos={starter}
      initialRegion={region}
      serverUserId={userId}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-[#06070a] flex items-center justify-center">
          <div className="size-36 rounded-full border border-cyan-400/20 animate-pulse" />
        </div>
      }
    >
      <AuthenticatedAtlas />
    </Suspense>
  );
}
