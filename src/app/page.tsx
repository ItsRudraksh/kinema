import { getAllEntries, readDb } from "@/lib/db";
import { fetchStarterCosmos } from "@/lib/tmdb";
import { OrbisApp } from "@/components/OrbisApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [entries, starter, db] = await Promise.all([
    getAllEntries(),
    fetchStarterCosmos(),
    readDb(),
  ]);

  return (
    <OrbisApp
      initialEntries={entries}
      initialCosmos={starter}
      initialRegion={db.region}
    />
  );
}
