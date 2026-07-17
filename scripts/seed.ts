/**
 * Idempotent seed generator (B4). Populates a believable intern population so Person
 * A's shell looks alive (CLAUDE.md section 8.5). Running twice yields identical state (stable
 * UUIDs + upserts, no duplicates). Uses the SERVICE-ROLE admin client (bypasses RLS).
 *
 * Run: npm run seed   (requires .env.local with Supabase URL + service-role key)
 */
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { TasteProfile } from "@/lib/types/contract";

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
const DEMO_NOW_MS = Date.parse("2026-07-16T18:00:00.000Z");
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

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
        // Round 3 (13.5) - persisted offer inputs so /api/finance is demoable.
        offer_salary: [120000, 135000, 145000, 118000, 160000][i % 5],
        relocation_stipend: i % 3 === 0 ? 5000 : 0,
        signing_bonus: i % 4 === 0 ? 10000 : 0,
      },
      { onConflict: "id" },
    );
    if (error) throw error;
  }
  const owner = users[0].id;
  console.log(`seeded ${users.length} interns`);

  const subletters: SeedUser[] = [];
  for (let i = 0; i < 3; i++) {
    const email = `subletter${i}@perch.demo`;
    const name = `Demo Subletter ${i}`;
    const id = await ensureAuthUser(email, name);
    subletters.push({ id, email, name });

    const { error } = await db.from("users").upsert(
      {
        id,
        name: [`Maya`, `Noor`, `Theo`][i] + " S.",
        company: "Perch Subletter",
        role: "Subletter",
        city: "Seattle",
        move_in_date: null,
        taste_profile: {},
        verified: true,
        avatar_url: null,
        user_type: "subletter",
      },
      { onConflict: "id" },
    );
    if (error) throw error;
  }
  console.log(`seeded ${subletters.length} demo subletters`);

  // ---- listings ----
  const listingStatuses = ["available", "available", "pending", "taken", "stale"] as const;
  const listings = Array.from({ length: 20 }, (_, i) => {
    const sourced = i % 2 === 0;
    const incomplete = i >= 16;
    return {
      id: uuid(`listing-${i}`),
      title: [`Sunny Capitol Hill studio`, `Cozy SLU 1BR`, `Shared Ballard house`, `U-District sublet`][i % 4] + ` #${i}`,
      address: incomplete && i % 2 === 0 ? null : `${100 + i} Demo St`,
      lat: incomplete && i % 3 === 0 ? null : 47.61 + (i % 5) * 0.004,
      lng: incomplete && i % 3 === 1 ? null : -122.34 + (i % 5) * 0.004,
      price: 1500 + (i % 6) * 300,
      lease_start: incomplete && i % 4 === 0 ? null : "2026-06-01",
      lease_end: incomplete && i % 4 === 1 ? null : i % 4 === 0 ? "2026-07-31" : "2026-08-31",
      lease_type: incomplete && i % 4 === 2 ? null : (["sublet", "short_term", "standard"] as const)[i % 3],
      source: sourced ? "seed" : null,
      photos: [],
      safety_flags:
        i % 7 === 0
          ? { scamSignals: ["asks for wire deposit"], notes: [] }
          : i % 5 === 0
            ? { scamSignals: [], notes: ["3rd-floor walkup"] }
            : { scamSignals: [], notes: [] },
      created_by: sourced ? null : subletters[i % subletters.length].id,
      status: i === 15 ? "available" : listingStatuses[i % listingStatuses.length],
      expires_at:
        i === 7
          ? new Date(DEMO_NOW_MS + 6 * HOUR_MS).toISOString()
          : i === 15
            ? new Date(DEMO_NOW_MS - DAY_MS).toISOString()
            : new Date(DEMO_NOW_MS + (7 + (i % 5)) * DAY_MS).toISOString(),
      last_confirmed_at: i % 3 === 0 ? new Date(DEMO_NOW_MS - (i % 4) * DAY_MS).toISOString() : null,
      sourced,
      source_name: sourced ? "seed-round2-base" : "subletter",
      source_url: sourced ? `https://example.test/perch/${i}` : null,
      external_id: sourced ? `round2-seed-${i}` : null,
      // Round 3 (13.2) comprehensive detail - deterministic variety per listing.
      furnished: i % 3 !== 0,
      pros: [
        ["Short walk to transit", "Bright and airy", "Furnished and move-in ready"][i % 3],
        ["Quiet street", "Close to coffee", "Near the office"][i % 3],
        ["Flexible move-in", "Great for interns", "Utilities simple"][i % 3],
      ],
      bedrooms: 1 + (i % 3),
      bathrooms: [1, 1, 1.5, 2][i % 4],
      sqft: 450 + (i % 6) * 75,
      amenities: [
        ["wifi", "in_unit_laundry", "dishwasher"],
        ["wifi", "gym", "rooftop"],
        ["wifi", "parking", "ac"],
      ][i % 3],
      utilities_included: i % 2 === 0,
    };
  });
  if ((await db.from("listings").upsert(listings, { onConflict: "id" })).error) throw new Error("listings upsert failed");
  console.log(`seeded ${listings.length} listings`);

  const swipes = [
    { id: uuid("swipe-u0-listing-0"), user_id: users[0].id, listing_id: uuid("listing-0"), direction: "left" },
    { id: uuid("swipe-u0-listing-1"), user_id: users[0].id, listing_id: uuid("listing-1"), direction: "right" },
    { id: uuid("swipe-u1-listing-10"), user_id: users[1].id, listing_id: uuid("listing-10"), direction: "right" },
    { id: uuid("swipe-u1-listing-11"), user_id: users[1].id, listing_id: uuid("listing-11"), direction: "left" },
  ];
  if ((await db.from("listing_swipes").upsert(swipes, { onConflict: "user_id,listing_id" })).error) {
    throw new Error("listing_swipes upsert failed");
  }
  console.log(`seeded ${swipes.length} listing swipes`);

  // ---- demo reviews (clearly demo content; idempotent known aggregates) ----
  const reviews = [
    {
      id: uuid("review-listing-0-u0"),
      subject_type: "listing",
      subject_id: listings[0].id,
      reviewer_id: users[0].id,
      rating: 5,
      body: "Demo review: bright room, host answered quickly, easy commute.",
    },
    {
      id: uuid("review-listing-0-u1"),
      subject_type: "listing",
      subject_id: listings[0].id,
      reviewer_id: users[1].id,
      rating: 4,
      body: "Demo review: solid summer sublet, a little street noise.",
    },
    {
      id: uuid("review-listing-0-u2"),
      subject_type: "listing",
      subject_id: listings[0].id,
      reviewer_id: users[2].id,
      rating: 4,
      body: "Demo review: close to coffee and transit.",
    },
    {
      id: uuid("review-subletter-0-u0"),
      subject_type: "subletter",
      subject_id: subletters[0].id,
      reviewer_id: users[0].id,
      rating: 5,
      body: "Demo review: friendly subletter, clear photos, no surprise fees.",
    },
    {
      id: uuid("review-subletter-0-u3"),
      subject_type: "subletter",
      subject_id: subletters[0].id,
      reviewer_id: users[3].id,
      rating: 4,
      body: "Demo review: fast responses and flexible tour times.",
    },
  ];
  if ((await db.from("reviews").upsert(reviews, { onConflict: "id" })).error) throw new Error("reviews upsert failed");
  console.log("seeded demo reviews (listing[0]: count=3 avg=4.3; subletter[0]: count=2 avg=4.5)");

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
    venue: [`The Crocodile`, `Kremwerk`, `Fremont Abbey`, `Union Hall`][i % 4],
    url: `https://perch.demo/events/seed-${i}`,
    image_url: `https://images.unsplash.com/photo-${["1501281668745-f7f57925c3b4", "1492684223066-81342ee5ff30", "1501386761578-eac5c94b800a", "1527529482837-4698179dc6ce"][i % 4]}?w=900`,
    price_range: i % 3 === 0 ? "Free" : `$${15 + i}-$${30 + i}`,
  }));
  if ((await db.from("events").upsert(events, { onConflict: "id" })).error) throw new Error("events upsert failed");
  console.log(`seeded ${events.length} events`);

  const attendance = events.flatMap((event, i) =>
    users.slice(0, (i % 4) + 1).map((user) => ({
      event_id: event.id,
      user_id: user.id,
    })),
  );
  if ((await db.from("event_attendance").upsert(attendance, { onConflict: "event_id,user_id" })).error) {
    throw new Error("event_attendance upsert failed");
  }
  console.log(`seeded ${attendance.length} event attendance rows`);

  const eventComments = events.slice(0, 8).flatMap((event, i) =>
    users.slice(0, 2).map((user, j) => ({
      id: uuid(`event-comment-${i}-${j}`),
      event_id: event.id,
      author_id: user.id,
      body: j === 0 ? "I'm going after work if anyone wants to meet up." : "This one fits the first-week bucket list.",
      created_at: new Date(Date.parse("2026-06-09T18:00:00Z") + (i * 2 + j) * 3_600_000).toISOString(),
    })),
  );
  if ((await db.from("event_comments").upsert(eventComments, { onConflict: "id" })).error) {
    throw new Error("event_comments upsert failed");
  }
  console.log(`seeded ${eventComments.length} event comments`);

  // ---- notes ----
  const notes = Array.from({ length: 10 }, (_, i) => ({
    id: uuid(`note-${i}`),
    city: CITIES[i % CITIES.length],
    area: ["Capitol Hill", "SLU", "Ballard"][i % 3],
    topic: ["Housing", "Transit", "Food"][i % 3],
    body: "Past-intern tip: sort your ORCA card in week one.",
    created_by: users[i % users.length].id,
    lat: null,
    lng: null,
  }));
  const mapComments = [
    {
      id: uuid("map-comment-capitol-hill-coffee"),
      city: null,
      area: null,
      topic: "Coffee",
      body: "Map comment: lots of interns work from this cafe before noon.",
      created_by: users[0].id,
      lat: 47.6142,
      lng: -122.3197,
    },
    {
      id: uuid("map-comment-slu-transit"),
      city: null,
      area: null,
      topic: "Transit",
      body: "Map comment: easy transfer point when heading to the office.",
      created_by: users[1].id,
      lat: 47.6217,
      lng: -122.3351,
    },
    {
      id: uuid("map-comment-outside-test-viewport"),
      city: null,
      area: null,
      topic: "Food",
      body: "Map comment: outside the default Seattle test viewport.",
      created_by: users[2].id,
      lat: 47.7001,
      lng: -122.4012,
    },
  ];
  const allNotes = [...notes, ...mapComments];
  if ((await db.from("notes").upsert(allNotes, { onConflict: "id" })).error) throw new Error("notes upsert failed");
  console.log(`seeded ${notes.length} legacy notes + ${mapComments.length} map comments`);

  // ---- checklist_items (round 3: real relocation tasks, grouped by category) ----
  const checklistTemplate: { label: string; due_offset: number; category: string }[] = [
    { label: "Sign sublease + send deposit", due_offset: 28, category: "admin" },
    { label: "Book flights to the city", due_offset: 21, category: "travel" },
    { label: "Book movers / arrange shipping", due_offset: 18, category: "logistics" },
    { label: "Sort out parking or a car", due_offset: 14, category: "logistics" },
    { label: "Set up direct deposit + bank", due_offset: 12, category: "admin" },
    { label: "Get a transit card", due_offset: 9, category: "logistics" },
    { label: "Pack a what-to-bring list (bedding, kitchen basics)", due_offset: 6, category: "packing" },
    { label: "Pack a first-week bag (nothing you can't buy)", due_offset: 2, category: "packing" },
  ];
  const checklist = users.slice(0, 6).flatMap((u, i) =>
    checklistTemplate.map((item, j) => ({
      id: uuid(`chk-${i}-${j}`),
      user_id: u.id,
      label: item.label,
      due_offset: item.due_offset,
      category: item.category,
      done: j === 0,
    })),
  );
  if ((await db.from("checklist_items").upsert(checklist, { onConflict: "id" })).error) throw new Error("checklist upsert failed");
  console.log(`seeded ${checklist.length} checklist items (travel/logistics/packing/admin)`);

  // ---- friendships (accepted + incoming pending, interns only) ----
  const friendships = [
    {
      id: uuid("friendship-u0-u1-accepted"),
      requester_id: users[0].id,
      addressee_id: users[1].id,
      status: "accepted",
      created_at: new Date(DEMO_NOW_MS - 2 * DAY_MS).toISOString(),
    },
    {
      id: uuid("friendship-u2-u0-pending"),
      requester_id: users[2].id,
      addressee_id: users[0].id,
      status: "pending",
      created_at: new Date(DEMO_NOW_MS - DAY_MS).toISOString(),
    },
  ];
  const friendshipIds = friendships.map((friendship) => friendship.id);
  if ((await db.from("friendships").delete().in("id", friendshipIds)).error) {
    throw new Error("friendships reset failed");
  }
  if ((await db.from("friendships").insert(friendships)).error) {
    throw new Error("friendships insert failed");
  }
  console.log("seeded friendships (one accepted, one incoming pending)");

  // ---- bookings (round 3: across the state machine so inbox + bar aren't empty) ----
  // listing-1/5/11 are subletter-owned and available in the seed; interns book them.
  const bookings = [
    {
      id: uuid("booking-requested"),
      listing_id: uuid("listing-1"),
      booker_id: users[1].id,
      roommate_ids: [] as string[],
      roommate_invites: [] as string[],
      status: "requested",
      created_at: new Date(DEMO_NOW_MS - 6 * HOUR_MS).toISOString(),
      decided_at: null as string | null,
    },
    {
      id: uuid("booking-approved"),
      listing_id: uuid("listing-5"),
      booker_id: users[2].id,
      roommate_ids: [],
      roommate_invites: [],
      status: "approved",
      created_at: new Date(DEMO_NOW_MS - 2 * DAY_MS).toISOString(),
      decided_at: new Date(DEMO_NOW_MS - DAY_MS).toISOString(),
    },
    {
      id: uuid("booking-booked"),
      listing_id: uuid("listing-11"),
      booker_id: users[3].id,
      roommate_ids: [users[1].id], // a confirmed roommate group
      roommate_invites: [],
      status: "booked",
      created_at: new Date(DEMO_NOW_MS - 3 * DAY_MS).toISOString(),
      decided_at: new Date(DEMO_NOW_MS - 2 * DAY_MS).toISOString(),
    },
  ];
  if ((await db.from("bookings").upsert(bookings, { onConflict: "id" })).error) throw new Error("bookings upsert failed");
  // A booked listing is taken so the deck drops it for everyone else (state-machine effect).
  if ((await db.from("listings").update({ status: "taken" }).eq("id", uuid("listing-11"))).error) {
    throw new Error("booked listing take failed");
  }
  console.log("seeded bookings (requested / approved / booked -> listing taken)");

  // ---- conversations + messages (so DMs aren't empty on open) ----
  for (let i = 1; i <= 4; i++) {
    const a = users[0].id;
    const b = users[i].id;
    const convId = uuid(`conv-${a}-${b}`);
    if ((await db.from("conversations").upsert(
      { id: convId, participant_ids: [a, b], last_message_at: new Date(DEMO_NOW_MS - i * HOUR_MS).toISOString() },
      { onConflict: "id" },
    )).error) throw new Error("conversations upsert failed");

    const msgs = [
      { id: uuid(`msg-${convId}-0`), conversation_id: convId, sender_id: b, recipient_id: a, body: "Hey! Same company + move week - want to split a place?", created_at: new Date(DEMO_NOW_MS - i * HOUR_MS - HOUR_MS).toISOString() },
      { id: uuid(`msg-${convId}-1`), conversation_id: convId, sender_id: a, recipient_id: b, body: "Yes! I shortlisted a few perches, sending now.", created_at: new Date(DEMO_NOW_MS - i * HOUR_MS - HOUR_MS / 2).toISOString() },
    ];
    if ((await db.from("messages").upsert(msgs, { onConflict: "id" })).error) throw new Error("messages upsert failed");
  }
  console.log("seeded conversations + messages");

  console.log("\nseed complete (idempotent - safe to re-run)");
  console.log(`   demo user id (set DEV_DEMO_USER_ID to drive routes): ${users[0].id}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
