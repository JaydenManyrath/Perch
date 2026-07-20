"use client";

import { useCallback, useEffect, useState } from "react";
import { getReviews, postReview, getMe } from "@/lib/data/source";
import type {
  Review,
  ReviewSummary,
  UserRow,
} from "@/lib/types/contract";
import { Stars, StarsInput } from "@/components/ui/Stars";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * ReviewsPanel (RA5) - Airbnb-style review composer + list.
 * Only interns (user_type === 'intern') may compose; subletters see read-only.
 * Mounts on the perch detail sheet (subjectType='listing') and on the subletter
 * profile (subjectType='subletter').
 */
export function ReviewsPanel({
  subjectType,
  subjectId,
  subjectLabel,
  className,
}: {
  subjectType: "listing" | "subletter";
  subjectId: string;
  subjectLabel?: string;
  className?: string;
}) {
  const [me, setMe] = useState<UserRow | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({ avgRating: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [meRow, r] = await Promise.all([getMe(), getReviews(subjectType, subjectId)]);
    setMe(meRow);
    setReviews(r.reviews);
    setSummary(r.summary);
    setLoading(false);
  }, [subjectType, subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canCompose = me?.user_type === "intern";
  const myExisting = reviews.find((r) => r.reviewer.id === me?.id);

  async function handleSubmit(rating: 1 | 2 | 3 | 4 | 5, body: string) {
    if (!canCompose) return;
    setBusy(true);
    try {
      await postReview({ subjectType, subjectId, rating, body });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Reviews" className={cn("flex flex-col gap-3", className)}>
      <header className="flex items-baseline justify-between gap-3">
        <h4 className="text-h3 text-ink-strong">Reviews</h4>
        <RatingBadge summary={summary} emptyLabel="No reviews yet" />
      </header>

      {canCompose ? (
        <ComposerCard
          existing={myExisting ?? null}
          subjectLabel={subjectLabel}
          onSubmit={handleSubmit}
          busy={busy}
        />
      ) : (
        <p className="text-caption text-ink-soft">
          Sign in as an intern to leave a review.
        </p>
      )}

      {loading ? (
        <p className="text-caption text-ink-soft">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-caption text-ink-soft">No reviews yet. Be the first.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-sky-100 bg-white p-3 shadow-card">
              <div className="flex items-center gap-3">
                <InitialsAvatar name={r.reviewer.name} src={r.reviewer.avatarUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${r.reviewer.id}`}
                    className="text-body font-semibold text-ink-strong hover:underline truncate block"
                  >
                    {r.reviewer.name}
                  </Link>
                  <Stars value={r.rating} size={12} />
                </div>
                <time className="text-caption text-ink-soft whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </div>
              <p className="mt-2 text-body text-ink-strong whitespace-pre-wrap">{r.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ComposerCard({
  existing,
  subjectLabel,
  onSubmit,
  busy,
}: {
  existing: Review | null;
  subjectLabel?: string;
  onSubmit: (rating: 1 | 2 | 3 | 4 | 5, body: string) => void;
  busy: boolean;
}) {
  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(
    (existing?.rating as 0 | 1 | 2 | 3 | 4 | 5) ?? 0,
  );
  const [body, setBody] = useState(existing?.body ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    onSubmit(rating, body.trim());
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-sky-200 bg-sky-50 p-3">
      <p className="text-caption text-ink-soft">
        {existing ? "Update your review" : subjectLabel ? `Rate ${subjectLabel}` : "Leave a review"}
      </p>
      <div className="mt-1.5">
        <StarsInput
          value={rating}
          onChange={(n) => setRating(n)}
        />
      </div>
      <label className="block mt-2">
        <span className="sr-only">Review body</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={400}
          placeholder="What stood out? (optional)"
          className="w-full rounded-xl border border-sky-300 bg-white px-3 py-2 text-body text-ink-strong focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </label>
      <div className="mt-2 flex items-center justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={rating === 0 || busy}
        >
          {existing ? "Update review" : "Post review"}
        </Button>
      </div>
    </form>
  );
}
