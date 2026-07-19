"use client";

import { useCallback } from "react";
import { findOrCreateConversation } from "@/lib/data/source";
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
      return findOrCreateConversation(meId, otherId);
    },
    [],
  );

  return { createOrOpen };
}
