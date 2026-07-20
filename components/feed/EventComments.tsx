"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { Button } from "@/components/ui/Button";
import { getEventComments, postEventComment } from "@/lib/data/source";
import type { EventComment } from "@/lib/types/contract";
import { cn } from "@/lib/utils";

/**
 * EventComments (RA13) - composer + list on an event card.
 * Loads GET /api/events/{id}/comments; posts via POST /api/events/{id}/comments.
 */
export function EventComments({
  eventId,
  className,
}: {
  eventId: string;
  className?: string;
}) {
  const [rows, setRows] = useState<EventComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEventComments(eventId)
      .then((r) => {
        if (!cancelled) setRows(r.comments);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    // Optimistic append.
    const optimistic: EventComment = {
      id: `tmp-${Date.now()}`,
      eventId,
      author: { id: "me", name: "You", avatarUrl: null },
      body: body.trim(),
      createdAt: new Date().toISOString(),
    };
    setRows((r) => [...r, optimistic]);
    const text = body.trim();
    setBody("");
    try {
      const created = await postEventComment(eventId, { body: text });
      setRows((r) => r.map((c) => (c.id === optimistic.id ? created : c)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("rounded-2xl border border-sky-100 bg-sky-50 p-3", className)}>
      {loading ? (
        <p className="text-caption text-ink-soft">Loading comments...</p>
      ) : rows.length === 0 ? (
        <p className="text-caption text-ink-soft">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              <Link
                href={`/profile/${c.author.id}`}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Open ${c.author.name}'s profile`}
                className="shrink-0"
              >
                <InitialsAvatar name={c.author.name} src={c.author.avatarUrl} size={28} />
              </Link>
              <div className="min-w-0 flex-1 rounded-2xl bg-white border border-sky-100 px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={`/profile/${c.author.id}`}
                    className="text-caption font-semibold text-ink-strong hover:underline truncate"
                  >
                    {c.author.name}
                  </Link>
                  <time className="text-[0.7rem] text-ink-soft whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </time>
                </div>
                <p className="mt-0.5 text-body text-ink-strong whitespace-pre-wrap">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Say something..."
          maxLength={280}
          className="flex-1 rounded-xl border border-sky-300 bg-white px-3 py-2 text-body text-ink-strong focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <Button type="submit" size="sm" disabled={!body.trim() || busy}>
          Post
        </Button>
      </form>
    </div>
  );
}
