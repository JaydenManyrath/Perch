import type { MatchesResponse } from "@/lib/types/contract";
import { otherUsersFixture } from "./users";

const u = (idx: number) => otherUsersFixture[idx];

// Ranked flock — the connection-hero seam. Varied banded + reasons.
export const matchesFixture: MatchesResponse = {
  matches: [
    {
      user: {
        id: u(0).id, name: u(0).name, role: u(0).role, city: u(0).city, avatarUrl: u(0).avatar_url,
      },
      company: u(0).company,
      moveWeek: "2026-06-08",
      banded: u(0).verified,
      tasteScore: 0.93,
      reasons: ["Same company", "Moving the same week", "Shared taste: Phoenix, Fred again.."],
    },
    {
      user: {
        id: u(3).id, name: u(3).name, role: u(3).role, city: u(3).city, avatarUrl: u(3).avatar_url,
      },
      company: u(3).company,
      moveWeek: "2026-06-08",
      banded: u(3).verified,
      tasteScore: 0.87,
      reasons: ["Same move week", "Shared taste: techno, house"],
    },
    {
      user: {
        id: u(8).id, name: u(8).name, role: u(8).role, city: u(8).city, avatarUrl: u(8).avatar_url,
      },
      company: u(8).company,
      moveWeek: "2026-06-08",
      banded: u(8).verified,
      tasteScore: 0.84,
      reasons: ["Same company", "Same move week", "Shared taste: Phoenix, Beach House"],
    },
    {
      user: {
        id: u(1).id, name: u(1).name, role: u(1).role, city: u(1).city, avatarUrl: u(1).avatar_url,
      },
      company: u(1).company,
      moveWeek: "2026-06-15",
      banded: u(1).verified,
      tasteScore: 0.81,
      reasons: ["Same neighborhood (Capitol Hill)", "Shared taste: Beach House, Mitski"],
    },
    {
      user: {
        id: u(10).id, name: u(10).name, role: u(10).role, city: u(10).city, avatarUrl: u(10).avatar_url,
      },
      company: u(10).company,
      moveWeek: "2026-06-08",
      banded: u(10).verified,
      tasteScore: 0.79,
      reasons: ["Same move week", "Shared taste: Mitski, indie"],
    },
    {
      user: {
        id: u(5).id, name: u(5).name, role: u(5).role, city: u(5).city, avatarUrl: u(5).avatar_url,
      },
      company: u(5).company,
      moveWeek: "2026-06-08",
      banded: u(5).verified,
      tasteScore: 0.75,
      reasons: ["Same move week", "New neighbor (Ballard)"],
    },
    {
      user: {
        id: u(9).id, name: u(9).name, role: u(9).role, city: u(9).city, avatarUrl: u(9).avatar_url,
      },
      company: u(9).company,
      moveWeek: "2026-06-08",
      banded: u(9).verified,
      tasteScore: 0.72,
      reasons: ["Same move week", "Shared taste: Four Tet, electronic"],
    },
    {
      user: {
        id: u(4).id, name: u(4).name, role: u(4).role, city: u(4).city, avatarUrl: u(4).avatar_url,
      },
      company: u(4).company,
      moveWeek: "2026-06-08",
      banded: u(4).verified,
      tasteScore: 0.68,
      reasons: ["Same move week", "SLU neighbor"],
    },
    {
      user: {
        id: u(2).id, name: u(2).name, role: u(2).role, city: u(2).city, avatarUrl: u(2).avatar_url,
      },
      company: u(2).company,
      moveWeek: "2026-06-15",
      banded: u(2).verified,
      tasteScore: 0.63,
      reasons: ["Same city", "Different move week"],
    },
    {
      user: {
        id: u(6).id, name: u(6).name, role: u(6).role, city: u(6).city, avatarUrl: u(6).avatar_url,
      },
      company: u(6).company,
      moveWeek: "2026-06-22",
      banded: u(6).verified,
      tasteScore: 0.6,
      reasons: ["Shared taste: shoegaze"],
    },
    {
      user: {
        id: u(7).id, name: u(7).name, role: u(7).role, city: u(7).city, avatarUrl: u(7).avatar_url,
      },
      company: u(7).company,
      moveWeek: "2026-06-08",
      banded: u(7).verified,
      tasteScore: 0.58,
      reasons: ["Same company", "Same move week"],
    },
    {
      user: {
        id: u(4).id, name: u(4).name, role: u(4).role, city: u(4).city, avatarUrl: u(4).avatar_url,
      },
      company: u(4).company,
      moveWeek: "2026-06-15",
      banded: u(4).verified,
      tasteScore: 0.55,
      reasons: ["Similar company (Stripe/Meta)"],
    },
  ],
};
