"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { STICKER_META } from "./sticker-catalog";
import type { StickerRow, UserRow } from "@/lib/types/contract";

/**
 * StickerReadSheet (RA38) - opens when an existing sticker marker is tapped.
 * Shows category + note + author + when. Read-only; the sticker is
 * intentionally not editable/deletable from the map (removes an attack vector
 * for the vibe layer).
 */
export function StickerReadSheet({
  sticker,
  author,
  onOpenChange,
}: {
  sticker: StickerRow | null;
  author: Pick<UserRow, "id" | "name" | "avatar_url"> | null;
  onOpenChange: (open: boolean) => void;
}) {
  const meta = sticker ? STICKER_META[sticker.category] : null;

  return (
    <Sheet open={sticker !== null} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        {sticker && meta ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 ring-2 ring-sky-400/40 text-h3"
                >
                  {meta.emoji}
                </span>
                <div className="min-w-0">
                  <SheetTitle>{meta.label}</SheetTitle>
                  <SheetDescription>{meta.hint}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            {sticker.note ? (
              <p className="mt-3 text-body text-ink-strong whitespace-pre-wrap">
                &ldquo;{sticker.note}&rdquo;
              </p>
            ) : (
              <p className="mt-3 text-caption text-ink-soft italic">
                No note - just the vibe.
              </p>
            )}

            {author ? (
              <Link
                href={`/profile/${author.id}`}
                className="mt-3 flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 hover:bg-sky-100 transition-colors"
              >
                <InitialsAvatar name={author.name} src={author.avatar_url} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-caption font-semibold text-ink-strong truncate">
                    Left by {author.name}
                  </p>
                  <p className="text-caption text-ink-soft">
                    {new Date(sticker.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </Link>
            ) : (
              <p className="mt-3 text-caption text-ink-soft">
                {new Date(sticker.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}

            <p className="mt-3 text-caption text-ink-soft">
              Positive-only tag - map stickers are vibes, not safety flags.
            </p>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
