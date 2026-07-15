"use client";

import { useCallback } from "react";
import { findOrCreateConversation, isLiveSupabase } from "@/lib/data/source";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { ConversationRow } from "@/lib/types/contract";

/**
 * Create-or-open a 2-person conversation.
 * Contract §7 rule: this is client-side under participant RLS. No separate API route.
 *
 * In `live` mode this queries `conversations` for a row whose participant_ids
 * contains both users (order-independent) and INSERTs when none exists.
 * Failures fall back to the fixture layer so onboarding demos never crash.
 */
export function useConversation() {
  const createOrOpen = useCallback(
    async (meId: string, otherId: string): Promise<ConversationRow> => {
      if (isLiveSupabase()) {
        const supa = getSupabaseBrowser();
        if (supa) {
          try {
            // participant_ids is a uuid[] — array contains both users, in either order.
            const { data: found } = await supa
              .from("conversations")
              .select("*")
              .contains("participant_ids", [meId, otherId])
              .limit(1)
              .maybeSingle();
            if (found) return found as ConversationRow;

            const now = new Date().toISOString();
            const { data: created, error } = await supa
              .from("conversations")
              .insert({
                participant_ids: [meId, otherId],
                last_message_at: now,
                created_at: now,
              })
              .select("*")
              .single();
            if (error) throw error;
            return created as ConversationRow;
          } catch {
            // Fall through to fixture behavior.
          }
        }
      }
      return findOrCreateConversation(meId, otherId);
    },
    [],
  );

  return { createOrOpen };
}
