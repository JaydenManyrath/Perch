# 01 - Make RLS tests discover every migration

**What to build:** Make the database security harness automatically exercise the complete migration history so every later Round 2 schema and policy change is verified without another hard-coded migration list.

**Blocked by:** None - can start immediately.

**Status:** done

- [x] The harness discovers every SQL migration and applies them once in lexical filename order instead of naming a fixed subset.
- [x] The harness bootstraps enough Supabase-compatible auth and storage state for the existing storage migration to execute in the same run.
- [x] Adding a later-numbered migration requires no harness code change for that migration to execute.
- [x] The suite queries the catalog and asserts both row-level security and forced row-level security for every table in the public schema.
- [x] A table with either RLS flag disabled makes the suite fail with the table name visible in the failure.
- [x] Existing participant-locked DM, ownership, positive-sticker, and anonymous default-deny tests remain green.
- [x] The normal test command can still skip the live Postgres suite, while the documented RLS test command runs it against the configured database.
