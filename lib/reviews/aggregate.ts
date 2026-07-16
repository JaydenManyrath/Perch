import type { SupabaseClient } from "@supabase/supabase-js";
import type { Review, ReviewSubject, ReviewSummary, ReviewsResponse } from "@/lib/types/contract";

export class ReviewInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewInputError";
  }
}

export class ReviewForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewForbiddenError";
  }
}

type ReviewRow = {
  id: string;
  subject_type: ReviewSubject;
  subject_id: string;
  reviewer_id: string;
  rating: number;
  body: string | null;
  created_at: string;
};

type ReviewerRow = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export function parseReviewSubject(subjectType: string | null, subjectId: string | null): {
  subjectType: ReviewSubject;
  subjectId: string;
} {
  if (subjectType !== "listing" && subjectType !== "subletter") {
    throw new ReviewInputError("subjectType must be listing or subletter");
  }
  if (!subjectId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(subjectId)) {
    throw new ReviewInputError("subjectId must be a UUID");
  }
  return { subjectType, subjectId };
}

export function parseReviewPayload(input: unknown): {
  subjectType: ReviewSubject;
  subjectId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
} {
  if (!input || typeof input !== "object") throw new ReviewInputError("review body must be an object");
  const record = input as Record<string, unknown>;
  const subject = parseReviewSubject(
    typeof record.subjectType === "string" ? record.subjectType : null,
    typeof record.subjectId === "string" ? record.subjectId : null,
  );
  if (!Number.isInteger(record.rating) || (record.rating as number) < 1 || (record.rating as number) > 5) {
    throw new ReviewInputError("rating must be an integer from 1 through 5");
  }
  if (record.body != null && typeof record.body !== "string") {
    throw new ReviewInputError("body must be a string");
  }
  return {
    ...subject,
    rating: record.rating as 1 | 2 | 3 | 4 | 5,
    body: (record.body ?? "").toString(),
  };
}

export function summarizeRatings(ratings: number[]): ReviewSummary {
  if (ratings.length === 0) return { avgRating: 0, count: 0 };
  const avg = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return { avgRating: Math.round(avg * 10) / 10, count: ratings.length };
}

export async function assertReviewSubjectExists(
  db: SupabaseClient,
  subjectType: ReviewSubject,
  subjectId: string,
): Promise<void> {
  const query =
    subjectType === "listing"
      ? db.from("listings").select("id").eq("id", subjectId).maybeSingle()
      : db.from("users").select("id").eq("id", subjectId).eq("user_type", "subletter").maybeSingle();
  const { data, error } = await query;
  if (error) throw error;
  if (!data) throw new ReviewInputError(`${subjectType} review subject was not found`);
}

export async function assertInternCaller(db: SupabaseClient, callerId: string): Promise<void> {
  const { data, error } = await db.from("users").select("id,user_type").eq("id", callerId).maybeSingle();
  if (error) throw error;
  if (!data || (data as { user_type?: string }).user_type !== "intern") {
    throw new ReviewForbiddenError("reviews can only be written by interns");
  }
}

export async function getReviewsResponse(
  db: SupabaseClient,
  subjectType: ReviewSubject,
  subjectId: string,
): Promise<ReviewsResponse> {
  await assertReviewSubjectExists(db, subjectType, subjectId);

  const { data, error } = await db
    .from("reviews")
    .select("id,subject_type,subject_id,reviewer_id,rating,body,created_at")
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as ReviewRow[];
  const reviewerIds = Array.from(new Set(rows.map((row) => row.reviewer_id)));
  const reviewers = new Map<string, ReviewerRow>();
  if (reviewerIds.length > 0) {
    const { data: users, error: usersError } = await db
      .from("users")
      .select("id,name,avatar_url")
      .in("id", reviewerIds);
    if (usersError) throw usersError;
    for (const user of (users ?? []) as ReviewerRow[]) reviewers.set(user.id, user);
  }

  const reviews: Review[] = rows.map((row) => {
    const reviewer = reviewers.get(row.reviewer_id);
    return {
      id: row.id,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      reviewer: {
        id: row.reviewer_id,
        name: reviewer?.name ?? "Unknown reviewer",
        avatarUrl: reviewer?.avatar_url ?? null,
      },
      rating: row.rating as Review["rating"],
      body: row.body ?? "",
      createdAt: row.created_at,
    };
  });

  return { reviews, summary: summarizeRatings(rows.map((row) => row.rating)) };
}

export async function upsertReview(
  db: SupabaseClient,
  callerId: string,
  input: { subjectType: ReviewSubject; subjectId: string; rating: 1 | 2 | 3 | 4 | 5; body: string },
): Promise<ReviewsResponse> {
  await assertInternCaller(db, callerId);
  await assertReviewSubjectExists(db, input.subjectType, input.subjectId);

  const { error } = await db.from("reviews").upsert(
    {
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      reviewer_id: callerId,
      rating: input.rating,
      body: input.body,
    },
    { onConflict: "subject_type,subject_id,reviewer_id" },
  );
  if (error) throw error;

  return getReviewsResponse(db, input.subjectType, input.subjectId);
}
