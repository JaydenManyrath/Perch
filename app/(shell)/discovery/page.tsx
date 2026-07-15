import { getMatches } from "@/lib/data/source";
import { DiscoveryStack } from "@/components/discovery/DiscoveryStack";

export default async function DiscoveryPage() {
  const { matches } = await getMatches();

  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header className="mb-4">
        <h1 className="text-h1 text-ink-strong">Discovery</h1>
        <p className="text-caption text-ink-soft">
          Find your flock — other interns at your company, in your city, moving your week.
          Tap <strong className="text-ink-strong">Message now</strong> and a live DM opens.
        </p>
      </header>
      <DiscoveryStack matches={matches} />
    </div>
  );
}
