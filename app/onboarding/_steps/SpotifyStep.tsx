"use client";

import { useState } from "react";
import { Music, ArrowRight, SkipForward } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { spotifyConnect, spotifyStatus } from "@/lib/data/source";
import type { TasteProfile } from "@/lib/types/contract";

/**
 * Step 2 — Spotify (read-only). The connect kicks off Composio-hosted OAuth
 * and we poll status until connected. On skip, Person B falls back to a
 * seeded taste profile (contract §4.6).
 */
export function SpotifyStep({
  onDone,
}: {
  onDone: (taste: TasteProfile | null) => void;
}) {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "connecting" }
    | { kind: "connected"; taste: TasteProfile | null }
  >({ kind: "idle" });

  async function connect() {
    setState({ kind: "connecting" });
    // Kick off the redirect (in fixture we don't leave the page — we just poll status).
    await spotifyConnect();
    // Poll for the resulting taste (fixture returns connected+taste immediately).
    const status = await spotifyStatus();
    setState({ kind: "connected", taste: status.taste });
  }

  if (state.kind === "connecting") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
        <Mascot variant="hop" size={160} />
        <div>
          <h2 className="text-h2 text-ink-strong">Reading your top artists…</h2>
          <p className="mt-1 text-body text-ink-soft">Read-only, no writes. Ever.</p>
        </div>
      </div>
    );
  }

  if (state.kind === "connected") {
    const t = state.taste;
    return (
      <div className="flex-1 flex flex-col gap-6">
        <header>
          <h2 className="text-h2 text-ink-strong">Your taste, on file</h2>
          <p className="mt-1 text-body text-ink-soft">
            This powers the Flyway ranking and your flock matches.
          </p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Top artists</CardTitle>
            <CardDescription>Read-only from Spotify.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {(t?.topArtists ?? []).slice(0, 6).map((a) => (
              <Chip key={a}>{a}</Chip>
            ))}
          </CardContent>
        </Card>
        {t?.topGenres && t.topGenres.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Genres</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {t.topGenres.map((g) => (
                <Chip key={g} tone="muted">{g}</Chip>
              ))}
            </CardContent>
          </Card>
        ) : null}
        <div className="mt-auto pt-6">
          <Button size="lg" className="w-full" onClick={() => onDone(t)}>
            Continue <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6">
      <header className="text-center">
        <Mascot variant="idle" size={120} />
        <h2 className="text-h2 text-ink-strong mt-4">Connect Spotify</h2>
        <p className="mt-1 text-body text-ink-soft">
          Just <strong className="text-ink-strong">read-only</strong> — top artists + tracks.
          Nothing plays, nothing posts.
        </p>
      </header>
      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={connect}>
          <Music className="h-4 w-4" aria-hidden /> Connect Spotify
        </Button>
        <Button variant="ghost" onClick={() => onDone(null)}>
          <SkipForward className="h-4 w-4" aria-hidden /> Skip for now
        </Button>
      </div>
      <p className="text-caption text-ink-soft text-center">
        Least-privilege: no playback control, no playlist writes.
      </p>
    </div>
  );
}
