"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import type { MapComment } from "@/lib/types/contract";

/**
 * CommentSheet (RA12) - two modes:
 *  - "read": read an existing map comment (comment prop is set)
 *  - "add": compose a new comment at a picked location (location prop is set)
 */
export function CommentSheet({
  mode,
  comment,
  location,
  onOpenChange,
  onSubmit,
}: {
  mode: "read" | "add" | null;
  comment: MapComment | null;
  location: { lat: number; lng: number } | null;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (input: { topic: string; body: string; lat: number; lng: number }) => Promise<void> | void;
}) {
  const [topic, setTopic] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode === "add") {
      setTopic("");
      setBody("");
    }
  }, [mode]);

  const open = mode !== null;

  async function submit() {
    if (!onSubmit || !location) return;
    const t = topic.trim();
    const b = body.trim();
    if (!t || !b) return;
    setBusy(true);
    try {
      await onSubmit({ topic: t, body: b, lat: location.lat, lng: location.lng });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        {mode === "read" && comment ? (
          <>
            <SheetHeader>
              <div className="flex items-start gap-3">
                <Link href={`/profile/${comment.author.id}`} onClick={(e) => e.stopPropagation()}>
                  <Avatar className="h-9 w-9">
                    {comment.author.avatarUrl ? (
                      <AvatarImage src={comment.author.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0">
                  <SheetTitle>{comment.topic}</SheetTitle>
                  <SheetDescription>
                    by{" "}
                    <Link
                      href={`/profile/${comment.author.id}`}
                      className="font-semibold text-ink-strong hover:underline"
                    >
                      {comment.author.name}
                    </Link>
                    {" - "}
                    {new Date(comment.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <p className="mt-2 text-body text-ink-strong whitespace-pre-wrap">{comment.body}</p>
            <p className="mt-3 text-caption text-ink-soft">
              Neutral location note - map comments are not safety flags.
            </p>
          </>
        ) : mode === "add" && location ? (
          <>
            <SheetHeader>
              <SheetTitle>Drop a comment here</SheetTitle>
              <SheetDescription>
                A neutral note anchored to this spot. Interns will see it on the map.
              </SheetDescription>
            </SheetHeader>
            <label className="block mt-3">
              <span className="text-caption text-ink-soft">Topic</span>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={80}
                placeholder="Something short and useful"
                className="mt-1 w-full rounded-xl border border-sky-300 bg-white px-3 py-2 text-body text-ink-strong focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>
            <label className="block mt-3">
              <span className="text-caption text-ink-soft">Body</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                maxLength={400}
                placeholder="What did you notice here?"
                className="mt-1 w-full rounded-xl border border-sky-300 bg-white px-3 py-2 text-body text-ink-strong focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={busy || !topic.trim() || !body.trim()}>
                {busy ? "Posting..." : "Post comment"}
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
