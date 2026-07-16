import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Freshness state machine (RC2, SOURCING-PROPOSAL.md). Deterministic - no model ever
 * decides a status. A daily pass flips expired `available` rows to `stale`; near-expiry
 * SUBLETTER listings are flagged for a "still available?" confirm ping (auto-sourced
 * rows have no owner to ping, so they simply expire). Person B owns the synchronous
 * confirm route that flips a stale row back to available; Person C owns this aging.
 */

const MS_PER_DAY = 86_400_000;
export const PING_WITHIN_DAYS = 2; // flag a subletter listing this close to expiry

export type FreshnessRow = {
  id: string;
  status: "available" | "pending" | "taken" | "stale";
  sourced: boolean;
  expires_at: string | null; // ISO timestamptz
};

export type FreshnessPlan = {
  expire: string[]; // ids to flip available -> stale
  ping: string[]; // subletter listing ids to send a confirm request
};

/** Pure: given current rows and `now`, decide which expire and which get pinged. */
export function planFreshness(rows: FreshnessRow[], now: number = Date.now()): FreshnessPlan {
  const expire: string[] = [];
  const ping: string[] = [];

  for (const row of rows) {
    if (row.status !== "available" || !row.expires_at) continue;
    const expiresMs = Date.parse(row.expires_at);
    if (Number.isNaN(expiresMs)) continue;

    if (now > expiresMs) {
      expire.push(row.id);
      continue;
    }
    // Not yet expired: near-expiry subletter rows get a confirm ping.
    if (!row.sourced && expiresMs - now <= PING_WITHIN_DAYS * MS_PER_DAY) {
      ping.push(row.id);
    }
  }

  expire.sort();
  ping.sort();
  return { expire, ping };
}

export type FreshnessResult = { expired: number; pinged: number };

/**
 * Apply the freshness pass with the service-role client: flip expired available rows to
 * stale. The ping list is returned for the caller to dispatch (there is no notification
 * table in the demo; A/B surface the confirm affordance). Never touches taken/pending.
 */
export async function runFreshnessPass(
  admin: SupabaseClient,
  now: number = Date.now(),
): Promise<FreshnessResult & { ping: string[] }> {
  const { data, error } = await admin
    .from("listings")
    .select("id,status,sourced,expires_at")
    .eq("status", "available");
  if (error) throw new Error(`freshness read failed: ${error.message}`);

  const plan = planFreshness((data ?? []) as FreshnessRow[], now);

  if (plan.expire.length > 0) {
    const { error: upErr } = await admin
      .from("listings")
      .update({ status: "stale" })
      .in("id", plan.expire);
    if (upErr) throw new Error(`freshness expire failed: ${upErr.message}`);
  }

  return { expired: plan.expire.length, pinged: plan.ping.length, ping: plan.ping };
}
