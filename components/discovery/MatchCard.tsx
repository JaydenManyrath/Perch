"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import { BandedBadge } from "@/components/ui/BandedBadge";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { formatMoveWeek } from "@/lib/utils";
import { ME_ID } from "@/lib/fixtures/users";
import { useConversation } from "@/lib/hooks/useConversation";
import type { Match } from "@/lib/types/contract";

/**
 * MatchCard — the flagship connection-hero surface. Reads the FROZEN Match
 * shape (contract §4.2). Decision surface — no mascot.
 *
 * "Message now" is the demo money-shot: tap → createOrOpen a 2-person
 * conversation (client-side under participant RLS, §7) → navigate to the
 * live DM thread with the composer auto-focused.
 */
export function MatchCard({ match, topPick = false }: { match: Match; topPick?: boolean }) {
  const router = useRouter();
  const { createOrOpen } = useConversation();
  const [busy, setBusy] = useState(false);

  async function messageNow() {
    if (busy) return;
    setBusy(true);
    try {
      const conv = await createOrOpen(ME_ID, match.user.id);
      router.push(`/dms/${conv.id}?focus=1`);
    } finally {
      // Note: don't reset busy on success — we're navigating away.
      setTimeout(() => setBusy(false), 1500);
    }
  }

  return (
    <Card className={topPick ? "ring-2 ring-accent-beak/50" : ""}>
      <CardContent className="p-4 pt-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-14 w-14 shrink-0">
            {match.user.avatarUrl ? <AvatarImage src={match.user.avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-h3">{match.user.name[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-h3 text-ink-strong truncate">{match.user.name}</h3>
              {match.banded ? <BandedBadge size="sm" /> : null}
              {topPick ? (
                <Chip tone="accent" className="ml-auto">
                  <Sparkles className="h-3 w-3" aria-hidden /> Top pick
                </Chip>
              ) : null}
            </div>
            <p className="text-caption text-ink-soft mt-0.5">
              {match.user.role} at {match.company} · {match.user.city} · moves {formatMoveWeek(match.moveWeek)}
            </p>
          </div>
        </div>

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {match.reasons.map((r) => (
            <li key={r}>
              <Chip>{r}</Chip>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-caption text-ink-soft">
            match {Math.round(match.tasteScore * 100)}%
          </div>
          <Button size="md" onClick={messageNow} disabled={busy} aria-label={`Message ${match.user.name} now`}>
            <Send className="h-4 w-4" aria-hidden />
            {busy ? "Opening…" : "Message now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
