"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, SkipForward, UserPlus } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { BandedBadge } from "@/components/ui/BandedBadge";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { getMatches, getMe, requestFriend } from "@/lib/data/source";
import {
  moveOverlapLabel,
  recommendedFlock,
  setFlockStatus,
  toFlockEntries,
  type FlockEntry,
  type FlockViewer,
} from "@/lib/onboarding/flock";

/**
 * Step: Find your flock (RA51). Recommends 3-6 interns to befriend the moment you
 * join, reusing getMatches() (no new API) and requestFriend() for the optimistic
 * add. Fully skippable and never blocks completion. Avatars are fallback-safe, so
 * a recommended intern with no profile picture still renders cleanly.
 */
export function FlockStep({ onDone }: { onDone: () => void }) {
  const [viewer, setViewer] = useState<FlockViewer | null>(null);
  const [entries, setEntries] = useState<FlockEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [me, { matches }] = await Promise.all([getMe(), getMatches()]);
      if (!active) return;
      const nextViewer: FlockViewer = {
        company: me.company,
        city: me.city,
        moveInDate: me.move_in_date,
      };
      setViewer(nextViewer);
      setEntries(toFlockEntries(recommendedFlock(matches, nextViewer)));
    })();
    return () => {
      active = false;
    };
  }, []);

  async function addFriend(userId: string) {
    // Optimistic: reflect the pending request immediately, then fire it. The
    // request stays "pending" (awaiting the other person) regardless of result -
    // requestFriend returns null only when you are already connected/requested.
    setEntries((prev) => (prev ? setFlockStatus(prev, userId, "pending") : prev));
    await requestFriend(userId);
  }

  if (!viewer || !entries) {
    return <FlockLoading />;
  }

  return (
    <FlockStepView entries={entries} viewer={viewer} onAdd={addFriend} onDone={onDone} />
  );
}

function FlockLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
      <Mascot variant="hop" size={160} />
      <div>
        <h2 className="text-h2 text-ink-strong">Finding your flock...</h2>
        <p className="mt-1 text-body text-ink-soft">
          Interns moving to your city around the same time as you.
        </p>
      </div>
    </div>
  );
}

/** Presentational step body - pure props, so it renders in the node test env. */
export function FlockStepView({
  entries,
  viewer,
  onAdd,
  onDone,
}: {
  entries: FlockEntry[];
  viewer: FlockViewer;
  onAdd: (userId: string) => void;
  onDone: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col gap-6">
      <header>
        <h2 className="text-h2 text-ink-strong">Find your flock</h2>
        <p className="mt-1 text-body text-ink-soft">
          Interns landing in {viewer.city || "your city"} around when you do. Add a few
          now, or do it later - your call.
        </p>
      </header>

      {entries.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.match.user.id}>
              <FlockCard entry={entry} viewer={viewer} onAdd={onAdd} />
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <CardContent className="p-4 text-body text-ink-soft">
            No recommendations yet. You can find your flock any time from the app.
          </CardContent>
        </Card>
      )}

      <div className="mt-auto pt-6 flex flex-col gap-2">
        <Button size="lg" className="w-full" onClick={onDone}>
          Continue <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
        <Button variant="ghost" onClick={onDone}>
          <SkipForward className="h-4 w-4" aria-hidden /> I&apos;ll find my flock later
        </Button>
      </div>
    </div>
  );
}

/** One recommendation row with an optimistic Add-friend button. Exported for tests. */
export function FlockCard({
  entry,
  viewer,
  onAdd,
}: {
  entry: FlockEntry;
  viewer: FlockViewer;
  onAdd: (userId: string) => void;
}) {
  const { match, status } = entry;
  const pending = status === "pending";

  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <InitialsAvatar name={match.user.name} src={match.user.avatarUrl} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-h3 text-ink-strong truncate">{match.user.name}</span>
            {match.banded ? <BandedBadge size="sm" showLabel={false} /> : null}
          </div>
          <p className="text-caption text-ink-soft truncate">
            {match.user.role} at {match.company}
          </p>
          <p className="text-caption text-ink-soft">{moveOverlapLabel(match, viewer)}</p>
        </div>
        <Button
          size="sm"
          variant={pending ? "subtle" : "primary"}
          onClick={() => onAdd(match.user.id)}
          disabled={pending}
          aria-label={
            pending
              ? `Friend request sent to ${match.user.name}`
              : `Add ${match.user.name} as a friend`
          }
        >
          {pending ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> Requested
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" aria-hidden /> Add friend
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
