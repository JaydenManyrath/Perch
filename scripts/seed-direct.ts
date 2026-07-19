/**
 * LOCAL direct-Postgres seeder (RB42, LOCAL mode).
 *
 * `scripts/seed.ts` is the authoritative LIVE seeder: it drives the Supabase auth
 * admin API (creating GoTrue users with the `perch-demo-<email>` password that
 * Person A's /login depends on) and PostgREST upserts. That path needs a real
 * hosted (or `supabase start`) project.
 *
 * When there is no Supabase project - only a throwaway Postgres (the LOCAL path
 * in the runbook) - this seeder writes the same shape of demo data straight over
 * a `pg` connection, as the database owner, so the schema, the RLS policies, and
 * the two-user isolation acceptance can be exercised end to end. Differences from
 * the LIVE seed, by design:
 *   - user ids are deterministic uuids (no GoTrue), so there are NO login
 *     passwords here; login is a LIVE-only capability. auth.uid() still resolves
 *     from a per-connection JWT claim, which is all RLS needs.
 *   - it is idempotent: stable ids + upserts, re-running adds no rows.
 *
 * Run:  SEED_DIRECT_DB_URL=postgres://postgres:postgres@127.0.0.1:54322/perch npm run seed:local
 */
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { Client } from "pg";

config({ path: ".env.local" });

const DB_URL = process.env.SEED_DIRECT_DB_URL || process.env.SUPABASE_DB_URL || process.env.RLS_TEST_DATABASE_URL;
if (!DB_URL) {
  console.error(
    "seed:local - set SEED_DIRECT_DB_URL (or SUPABASE_DB_URL / RLS_TEST_DATABASE_URL) to the local Postgres.\n" +
      "  e.g. SEED_DIRECT_DB_URL=postgres://postgres:postgres@127.0.0.1:54322/perch npm run seed:local",
  );
  process.exit(1);
}
// Guardrail: this owner-level seeder is for LOCAL Postgres only. A hosted project
// must go through `npm run seed:live` (GoTrue users + service-role, not raw SQL).
if (/supabase\.(co|com|net)|pooler\.supabase/i.test(DB_URL)) {
  console.error("seed:local - refusing to run against a hosted Supabase URL. Use `npm run seed:live` for the real project.");
  process.exit(1);
}

/** Deterministic RFC-4122-shaped uuid from a stable name (idempotent re-seeds). */
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
];
const CATS = ["good_coffee", "safe_feeling", "interns_hang", "good_vibe", "great_food", "green_space"];
const NOW = Date.parse("2026-07-16T18:00:00.000Z");
const DAY = 86_400_000;
const HOUR = 3_600_000;

const internId = (i: number) => uuid(`local-intern-${i}`);
const subletterId = (i: number) => uuid(`local-subletter-${i}`);

async function main(): Promise<void> {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();
  // Pin the JWT-claims GUC to valid empty JSON so trigger auth.uid() sees a null
  // caller and takes the server path (matches the RLS harness convention).
  await c.query("set request.jwt.claims = '{}'");
  try {
    const N_INTERNS = 6;
    const N_SUB = 2;

    // ---- auth.users (shim/managed) + public.users ----
    for (let i = 0; i < N_INTERNS; i++) {
      const id = internId(i);
      await c.query("insert into auth.users(id) values ($1) on conflict do nothing", [id]);
      await c.query(
        `insert into public.users (id, name, company, role, city, move_in_date, taste_profile, verified, user_type,
           offer_salary, relocation_stipend, signing_bonus)
         values ($1,$2,$3,$4,$5,$6,$7,$8,'intern',$9,$10,$11)
         on conflict (id) do update set
           name=excluded.name, company=excluded.company, role=excluded.role, city=excluded.city,
           move_in_date=excluded.move_in_date, taste_profile=excluded.taste_profile, verified=excluded.verified,
           offer_salary=excluded.offer_salary, relocation_stipend=excluded.relocation_stipend, signing_bonus=excluded.signing_bonus`,
        [
          id,
          [`Ada`, `Ben`, `Cy`, `Dee`, `Eli`, `Fin`][i % 6] + ` ${String.fromCharCode(75 + (i % 12))}.`,
          COMPANIES[i % COMPANIES.length],
          ["SWE Intern", "PM Intern", "Design Intern"][i % 3],
          CITIES[i % CITIES.length],
          ["2026-06-08", "2026-06-15", "2026-06-01"][i % 3],
          JSON.stringify({ topArtists: [`Artist ${i}`], topGenres: GENRES[i % GENRES.length], topTracks: [`Track ${i}`] }),
          i % 3 === 0,
          [120000, 135000, 145000][i % 3],
          i % 3 === 0 ? 5000 : 0,
          i % 4 === 0 ? 10000 : 0,
        ],
      );
    }
    for (let i = 0; i < N_SUB; i++) {
      const id = subletterId(i);
      await c.query("insert into auth.users(id) values ($1) on conflict do nothing", [id]);
      await c.query(
        `insert into public.users (id, name, company, role, city, taste_profile, verified, user_type)
         values ($1,$2,'Perch Subletter','Subletter','Seattle','{}'::jsonb,true,'subletter')
         on conflict (id) do update set name=excluded.name, user_type='subletter', verified=true`,
        [id, [`Maya`, `Noor`][i] + " S."],
      );
    }
    console.log(`seeded ${N_INTERNS} interns + ${N_SUB} subletters`);

    // ---- listings (subletter-owned available + sourced) ----
    const listingIds: string[] = [];
    for (let i = 0; i < 6; i++) {
      const id = uuid(`local-listing-${i}`);
      listingIds.push(id);
      const sourced = i % 2 === 1;
      await c.query(
        `insert into public.listings (
           id, title, address, lat, lng, price, lease_start, lease_end, lease_type,
           created_by, status, expires_at, last_confirmed_at, sourced, source_name, source_url, external_id,
           furnished, bedrooms, bathrooms, sqft, amenities, utilities_included, safety_flags, photos, pros
         ) values ($1,$2,$3,$4,$5,$6,current_date,current_date + 70,'sublet',
           $7,'available', now() + interval '10 days', now() - interval '1 day', $8,$9,$10,$11,
           true, $12, 1, 550, $13, true, '{"scamSignals":[],"notes":[]}'::jsonb, '{}'::text[], $14)
         on conflict (id) do update set title=excluded.title, price=excluded.price, status='available',
           expires_at=excluded.expires_at`,
        [
          id,
          [`Sunny Capitol Hill studio`, `Cozy SLU 1BR`, `Shared Ballard house`, `U-District sublet`][i % 4] + ` #${i}`,
          `${100 + i} Demo St`,
          47.61 + (i % 5) * 0.004,
          -122.34 + (i % 5) * 0.004,
          1500 + (i % 6) * 300,
          sourced ? null : subletterId(i % N_SUB),
          sourced,
          sourced ? "seed-round4-local" : "subletter",
          sourced ? `https://example.test/perch/${i}` : null,
          sourced ? `round4-local-${i}` : null,
          1 + (i % 3),
          ["wifi", "in_unit_laundry", "dishwasher"],
          ["Short walk to transit", "Bright and airy", "Near the office"],
        ],
      );
    }
    console.log(`seeded ${listingIds.length} listings`);

    // ---- listing_swipes ----
    await c.query(
      `insert into public.listing_swipes(id, user_id, listing_id, direction) values
         ($1,$2,$3,'right'),($4,$5,$6,'left')
       on conflict (user_id, listing_id) do nothing`,
      [uuid("local-swipe-0"), internId(0), listingIds[0], uuid("local-swipe-1"), internId(1), listingIds[2]],
    );

    // ---- reviews (intern -> listing + subletter) ----
    await c.query(
      `insert into public.reviews(id, subject_type, subject_id, reviewer_id, rating, body) values
         ($1,'listing',$2,$3,5,'Demo review: bright room, easy commute.'),
         ($4,'subletter',$5,$6,5,'Demo review: friendly subletter, clear photos.')
       on conflict (id) do nothing`,
      [uuid("local-review-0"), listingIds[0], internId(0), uuid("local-review-1"), subletterId(0), internId(1)],
    );

    // ---- stickers (positive-only) ----
    for (let i = 0; i < 8; i++) {
      await c.query(
        "insert into public.stickers(id, lat, lng, category, note, created_by) values ($1,$2,$3,$4,$5,$6) on conflict (id) do nothing",
        [uuid(`local-sticker-${i}`), 47.61 + i * 0.003, -122.34 + i * 0.003, CATS[i % CATS.length], "Interns hang here", internId(i % N_INTERNS)],
      );
    }
    console.log("seeded stickers");

    // ---- events + attendance + comments ----
    const eventIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = uuid(`local-event-${i}`);
      eventIds.push(id);
      await c.query(
        `insert into public.events(id, title, category, lat, lng, datetime, source, venue, url, image_url, price_range)
         values ($1,$2,$3,$4,$5,$6,'seed',$7,$8,$9,$10)
         on conflict (id) do nothing`,
        [
          id,
          [`Indie show`, `Techno night`, `Folk open mic`, `Intern mixer`][i % 4] + ` #${i}`,
          ["indie", "techno", "folk", "live"][i % 4],
          47.6 + i * 0.005,
          -122.33 - i * 0.005,
          new Date(Date.now() + (i + 2) * DAY).toISOString(), // future-relative: always upcoming
          [`The Crocodile`, `Kremwerk`, `Fremont Abbey`, `Union Hall`][i % 4],
          `https://perch.demo/events/local-${i}`,
          "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=900",
          i % 3 === 0 ? "Free" : `$${15 + i}-$${30 + i}`,
        ],
      );
      for (let j = 0; j <= i % 3; j++) {
        await c.query("insert into public.event_attendance(event_id, user_id) values ($1,$2) on conflict (event_id,user_id) do nothing", [
          id,
          internId(j),
        ]);
      }
      await c.query(
        "insert into public.event_comments(id, event_id, author_id, body) values ($1,$2,$3,$4) on conflict (id) do nothing",
        [uuid(`local-event-comment-${i}`), id, internId(0), "I'm going after work if anyone wants to meet up."],
      );
    }
    console.log(`seeded ${eventIds.length} events (+attendance, +comments)`);

    // ---- notes (legacy) + map comments ----
    await c.query(
      `insert into public.notes(id, city, area, topic, body, created_by, lat, lng) values
         ($1,'Seattle','Capitol Hill','Transit','Past-intern tip: sort your ORCA card week one.',$2,null,null),
         ($3,null,null,'Coffee','Map comment: interns work from this cafe before noon.',$4,47.6142,-122.3197)
       on conflict (id) do nothing`,
      [uuid("local-note-0"), internId(0), uuid("local-map-comment-0"), internId(1)],
    );
    console.log("seeded notes + map comments");

    // ---- friendships (reset then insert: one accepted, one incoming pending) ----
    const fAccepted = uuid("local-friendship-0-1-accepted");
    const fPending = uuid("local-friendship-2-0-pending");
    await c.query("delete from public.friendships where id = any($1)", [[fAccepted, fPending]]);
    await c.query(
      `insert into public.friendships(id, requester_id, addressee_id, status) values
         ($1,$2,$3,'accepted'),($4,$5,$6,'pending')`,
      [fAccepted, internId(0), internId(1), fPending, internId(2), internId(0)],
    );
    console.log("seeded friendships (one accepted, one pending)");

    // ---- bookings (intern0 books a subletter-owned listing) ----
    await c.query(
      `insert into public.bookings(id, listing_id, booker_id, status, roommate_ids, roommate_invites, created_at)
       values ($1,$2,$3,'requested','{}'::uuid[],'{}'::uuid[], now())
       on conflict (id) do update set status='requested'`,
      [uuid("local-booking-0"), listingIds[0], internId(0)],
    );
    console.log("seeded booking (intern0 -> listing0, requested)");

    // ---- conversation + private message (intern0 <-> intern1) for the isolation demo ----
    const convId = uuid("local-conv-0-1");
    await c.query(
      "insert into public.conversations(id, participant_ids, last_message_at) values ($1,$2, now()) on conflict (id) do nothing",
      [convId, [internId(0), internId(1)]],
    );
    await c.query(
      `insert into public.messages(id, conversation_id, sender_id, recipient_id, body, created_at) values
         ($1,$2,$3,$4,'Private: want to split a place?', now() - interval '1 hour'),
         ($5,$2,$4,$3,'Yes - sending my shortlist.', now() - interval '30 minutes')
       on conflict (id) do nothing`,
      [uuid("local-msg-0"), convId, internId(0), internId(1), uuid("local-msg-1")],
    );
    console.log("seeded conversation + messages (intern0 <-> intern1)");

    // ---- checklist_items ----
    const tasks = [
      { label: "Sign sublease + send deposit", off: 28, cat: "admin" },
      { label: "Book flights to the city", off: 21, cat: "travel" },
      { label: "Get a transit card", off: 9, cat: "logistics" },
    ];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < tasks.length; j++) {
        await c.query(
          "insert into public.checklist_items(id, user_id, label, due_offset, category, done) values ($1,$2,$3,$4,$5,$6) on conflict (id) do nothing",
          [uuid(`local-chk-${i}-${j}`), internId(i), tasks[j].label, tasks[j].off, tasks[j].cat, j === 0],
        );
      }
    }
    console.log("seeded checklist items");

    console.log("\nseed:local complete (idempotent - safe to re-run).");
    console.log(`  demo intern0 id: ${internId(0)}`);
    console.log(`  demo intern1 id: ${internId(1)}`);
    console.log(`  demo intern2 id (non-participant): ${internId(2)}`);
    console.log(`  conversation ${convId} + booking ${uuid("local-booking-0")} are the isolation-demo rows.`);
  } finally {
    await c.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
