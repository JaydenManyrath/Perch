/**
 * Idempotent seed generator (B4). Populates a believable intern population so Person
 * A's shell looks alive (CLAUDE.md §8.5). Running twice yields identical state (stable
 * UUIDs + upserts, no duplicates). Uses the SERVICE-ROLE admin client (bypasses RLS).
 *
 * Run: npm run seed   (requires .env.local with Supabase URL + service-role key)
 */
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { TasteProfile } from "../src/lib/contract";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("seed: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

/** Deterministic RFC-4122-shaped UUID from a stable name (so re-seeding is idempotent). */
function uuid(name: string): string {
  const h = createHash("sha1").update(name).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const COMPANIES = ["Stripe", "Meta", "Figma", "Databricks", "Notion"];
const CITIES = ["Seattle", "San Francisco", "Austin", "New York"];
const GENRES = [
  ["indie", "electronic", "techno"],
  ["hip hop", "r&b", "soul"],
  ["indie", "folk", "live"],
  ["house", "techno", "electronic"],
  ["rock", "punk", "live"],
];
const MOVE_WEEKS = ["2026-06-08", "2026-06-08", "2026-06-15", "2026-06-01", "2026-06-15"];

function taste(i: number): TasteProfile {
  const g = GENRES[i % GENRES.length];
  return { topArtists: [`Artist ${i}`, `Band ${i % 4}`], topGenres: g, topTracks: [`Track ${i}`] };
}

type SeedUser = { id: string; email: string; name: string };

async function ensureAuthUser(email: string, name: string): Promise<string> {
  // Idempotent: try create; if it already exists, look it up.
  const { data, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    password: "perch-demo-" + email,
    user_metadata: { name },
  });
  if (data?.user) return data.user.id;
  if (error && !/already/i.test(error.message)) throw error;

  // Find the existing user by paging the admin list.
  for (let page = 1; page <= 10; page++) {
    const { data: list } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const found = list?.users.find((u) => u.email === email);
    if (found) return found.id;
    if (!list || list.users.length < 200) break;
  }
  throw new Error(`could not resolve auth user for ${email}`);
}

async function seed() {
  const N = 24;
  const users: SeedUser[] = [];

  // ---- interns (auth users + profiles) ----
  for (let i = 0; i < N; i++) {
    const email = `intern${i}@perch.demo`;
    const name = `Intern ${i}`;
    const id = await ensureAuthUser(email, name);
    users.push({ id, email, name });

    const { error } = await db.from("users").upsert(
      {
        id,
        name: [`Ada`, `Ben`, `Cy`, `Dee`, `Eli`, `Fin`][i % 6] + ` ${String.fromCharCode(75 + (i % 12))}.`,
        company: COMPANIES[i % COMPANIES.length],
        role: ["SWE Intern", "PM Intern", "Design Intern"][i % 3],
        city: CITIES[i % CITIES.length],
        move_in_date: MOVE_WEEKS[i % MOVE_WEEKS.length],
        taste_profile: taste(i),
        verified: i % 3 === 0, // ~1/3 banded
        avatar_url: null,
      },
      { onConflict: "id" },
    );
    if (error) throw error;
  }
  const owner = users[0].id;
  console.log(`seeded ${users.length} interns`);

  // ---- listings ----
  const listings = Array.from({ length: 15 }, (_, i) => ({
    id: uuid(`listing-${i}`),
    title: [`Sunny Capitol Hill studio`, `Cozy SLU 1BR`, `Shared Ballard house`, `U-District sublet`][i % 4] + ` #${i}`,
    address: `${100 + i} Demo St`,
    lat: 47.61 + (i % 5) * 0.004,
    lng: -122.34 + (i % 5) * 0.004,
    price: 1500 + (i % 6) * 300,
    lease_start: "2026-06-01",
    lease_end: i % 4 === 0 ? "2026-07-31" : "2026-08-31",
    lease_type: (["sublet", "short_term", "standard"] as const)[i % 3],
    source: "seed",
    photos: [],
    safety_flags:
      i % 7 === 0
        ? { scamSignals: ["asks for wire deposit"], notes: [] }
        : i % 5 === 0
          ? { scamSignals: [], notes: ["3rd-floor walkup"] }
          : { scamSignals: [], notes: [] },
    created_by: owner,
  }));
  if ((await db.from("listings").upsert(listings, { onConflict: "id" })).error) throw new Error("listings upsert failed");
  console.log(`seeded ${listings.length} listings`);

  // ---- stickers (positive only) ----
  const CATS = ["good_coffee", "safe_feeling", "interns_hang", "good_vibe", "great_food", "green_space"] as const;
  const stickers = Array.from({ length: 30 }, (_, i) => ({
    id: uuid(`sticker-${i}`),
    lat: 47.61 + (i % 10) * 0.003,
    lng: -122.34 + (i % 10) * 0.003,
    category: CATS[i % CATS.length],
    note: ["Best latte on the hill", "Interns hang here Fridays", "Quiet + safe at night", "Great tacos"][i % 4],
    created_by: users[i % users.length].id,
  }));
  if ((await db.from("stickers").upsert(stickers, { onConflict: "id" })).error) throw new Error("stickers upsert failed");
  console.log(`seeded ${stickers.length} stickers`);

  // ---- events ----
  const events = Array.from({ length: 15 }, (_, i) => ({
    id: uuid(`event-${i}`),
    title: [`Indie show at The Crocodile`, `Techno night`, `Folk open mic`, `Intern mixer`][i % 4] + ` #${i}`,
    category: ["indie", "techno", "folk", "live"][i % 4],
    lat: 47.6 + (i % 6) * 0.005,
    lng: -122.33 - (i % 6) * 0.005,
    datetime: new Date(Date.parse("2026-06-10T00:00:00Z") + i * 86_400_000).toISOString(),
    source: "seed",
  }));
  if ((await db.from("events").upsert(events, { onConflict: "id" })).error) throw new Error("events upsert failed");
  console.log(`seeded ${events.length} events`);

  // ---- notes ----
  const notes = Array.from({ length: 10 }, (_, i) => ({
    id: uuid(`note-${i}`),
    city: CITIES[i % CITIES.length],
    area: ["Capitol Hill", "SLU", "Ballard"][i % 3],
    topic: ["Housing", "Transit", "Food"][i % 3],
    body: "Past-intern tip: sort your ORCA card in week one.",
    created_by: users[i % users.length].id,
  }));
  if ((await db.from("notes").upsert(notes, { onConflict: "id" })).error) throw new Error("notes upsert failed");
  console.log(`seeded ${notes.length} notes`);

  // ---- checklist_items ----
  const checklist = users.slice(0, 6).flatMap((u, i) =>
    ["Sign sublease", "Set up bank", "Get transit card", "Buy bedding"].map((label, j) => ({
      id: uuid(`chk-${i}-${j}`),
      user_id: u.id,
      label,
      due_offset: (j + 1) * 7,
      done: j === 0,
    })),
  );
  if ((await db.from("checklist_items").upsert(checklist, { onConflict: "id" })).error) throw new Error("checklist upsert failed");
  console.log(`seeded ${checklist.length} checklist items`);

  // ---- conversations + messages (so DMs aren't empty on open) ----
  for (let i = 1; i <= 4; i++) {
    const a = users[0].id;
    const b = users[i].id;
    const convId = uuid(`conv-${a}-${b}`);
    if ((await db.from("conversations").upsert(
      { id: convId, participant_ids: [a, b], last_message_at: new Date().toISOString() },
      { onConflict: "id" },
    )).error) throw new Error("conversations upsert failed");

    const msgs = [
      { id: uuid(`msg-${convId}-0`), conversation_id: convId, sender_id: b, recipient_id: a, body: "Hey! Same company + move week — want to split a place?", created_at: new Date(Date.now() - 3600_000).toISOString() },
      { id: uuid(`msg-${convId}-1`), conversation_id: convId, sender_id: a, recipient_id: b, body: "Yes! I shortlisted a few perches, sending now.", created_at: new Date(Date.now() - 1800_000).toISOString() },
    ];
    if ((await db.from("messages").upsert(msgs, { onConflict: "id" })).error) throw new Error("messages upsert failed");
  }
  console.log("seeded conversations + messages");

  console.log("\n✅ seed complete (idempotent — safe to re-run)");
  console.log(`   demo user id (set DEV_DEMO_USER_ID to drive routes): ${owner}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
