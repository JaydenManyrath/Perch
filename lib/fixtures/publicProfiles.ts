import type { PublicProfile, ReviewSummary } from "@/lib/types/contract";
import { meFixture, otherUsersFixture, sublettersFixture } from "./users";
import { reviewsFixture } from "./reviews";
import { listingsFixture } from "./listings";

function summarizeSubletter(subletterId: string): ReviewSummary {
  const rows = reviewsFixture.filter(
    (r) => r.subjectType === "subletter" && r.subjectId === subletterId,
  );
  if (rows.length === 0) return { avgRating: 0, count: 0 };
  const sum = rows.reduce((acc, r) => acc + r.rating, 0);
  return { avgRating: sum / rows.length, count: rows.length };
}

/** Look up a user's public profile by id. Handles interns + subletters + "me". */
export function publicProfileFor(id: string): PublicProfile | null {
  if (id === "me" || id === meFixture.id) {
    return {
      user: {
        id: meFixture.id,
        name: meFixture.name,
        role: meFixture.role,
        city: meFixture.city,
        company: meFixture.company,
        avatarUrl: meFixture.avatar_url,
      },
      userType: meFixture.user_type ?? "intern",
      banded: meFixture.verified,
    };
  }
  const intern = otherUsersFixture.find((u) => u.id === id);
  if (intern) {
    return {
      user: {
        id: intern.id,
        name: intern.name,
        role: intern.role,
        city: intern.city,
        company: intern.company,
        avatarUrl: intern.avatar_url,
      },
      userType: intern.user_type ?? "intern",
      banded: intern.verified,
    };
  }
  const sub = sublettersFixture.find((u) => u.id === id);
  if (sub) {
    return {
      user: {
        id: sub.id,
        name: sub.name,
        role: sub.role,
        city: sub.city,
        company: sub.company,
        avatarUrl: sub.avatar_url,
      },
      userType: sub.user_type ?? "subletter",
      banded: sub.verified,
      reviewSummary: summarizeSubletter(sub.id),
      listings: listingsFixture.filter((l) => l.created_by === sub.id),
    };
  }
  return null;
}
