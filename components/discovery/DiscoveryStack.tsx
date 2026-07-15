import { MatchCard } from "./MatchCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Match } from "@/lib/types/contract";

/**
 * DiscoveryStack — a grid/stack of ranked flock cards. First card is marked
 * top pick; ordering is B's deterministic tasteScore (contract §4.2).
 */
export function DiscoveryStack({ matches }: { matches: Match[] }) {
  if (matches.length === 0) {
    return (
      <EmptyState
        title="No matches yet"
        body="Finish onboarding to seed a taste profile — then your flock will land here."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {matches.map((m, i) => (
        <li key={m.user.id + i}>
          <MatchCard match={m} topPick={i === 0} />
        </li>
      ))}
    </ul>
  );
}
