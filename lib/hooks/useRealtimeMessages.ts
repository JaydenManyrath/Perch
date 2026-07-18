"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  reconcile,
  addPending,
  markFailed,
  type UIMessage,
} from "./reconcile";
import type { MessageRow } from "@/lib/types/contract";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { getConversationMessages, insertMessage, isLiveSupabase } from "@/lib/data/source";

/**
 * useRealtimeMessages — subscribes to a Supabase Realtime channel for a
 * conversation, applies optimistic sends, and reconciles echoes.
 *
 * Channel convention (contract §5): one channel per conversation, listening
 * to Postgres INSERT on `messages` filtered by conversation_id.
 *
 * Gate: participant-locked RLS on messages+conversations (B2) must be
 * deployed before a real DM demo. Without it, the filter is not a security
 * boundary — RLS is the boundary. Under `fixture` mode we simulate the echo
 * so the reconcile path exercises for the demo.
 */
export function useRealtimeMessages(conversationId: string, meId: string) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const pendingBodies = useRef<Map<string, { body: string; recipientId: string }>>(new Map());

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function loadInitialMessages() {
      if (isLiveSupabase()) {
        const supabase = getSupabaseBrowser();
        if (supabase) {
          const { data, error } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });
          if (!error && data) return data as MessageRow[];
        }
      }
      return getConversationMessages(conversationId);
    }

    loadInitialMessages()
      .then((rows) => {
        if (!cancelled) {
          // The subscription starts independently. Reconcile rather than
          // replace so an INSERT received during this read is never lost.
          setMessages((current) => rows.reduce(reconcile, current));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Realtime subscription (live only).
  useEffect(() => {
    if (!isLiveSupabase()) return;
    const supa = getSupabaseBrowser();
    if (!supa) return;

    const channel = supa
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const echo = payload.new as MessageRow;
          setMessages((prev) => reconcile(prev, echo));
        },
      )
      .subscribe();

    return () => {
      supa.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (input: { body: string; recipientId: string }) => {
      const body = input.body.trim();
      if (!body) return;
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      pendingBodies.current.set(tempId, { body, recipientId: input.recipientId });

      setMessages((prev) =>
        addPending(prev, {
          conversation_id: conversationId,
          sender_id: meId,
          recipient_id: input.recipientId,
          body,
          tempId,
        }),
      );

      try {
        if (isLiveSupabase()) {
          const supa = getSupabaseBrowser();
          if (supa) {
            // Select the inserted canonical row as a safety net. The sender is
            // normally subscribed to their own INSERT, but this makes a
            // delayed Realtime delivery harmless and lets reconcile dedupe its
            // eventual echo by id.
            const { data, error } = await supa
              .from("messages")
              .insert({
                conversation_id: conversationId,
                sender_id: meId,
                recipient_id: input.recipientId,
                body,
              })
              .select()
              .single();
            if (error) throw error;
            if (data) setMessages((prev) => reconcile(prev, data as MessageRow));
            pendingBodies.current.delete(tempId);
            return;
          }
        }
        // Fixture: no channel — simulate the echo by reconciling with the row we just wrote.
        const row = await insertMessage({
          conversation_id: conversationId,
          sender_id: meId,
          recipient_id: input.recipientId,
          body,
        });
        setMessages((prev) => reconcile(prev, row));
        pendingBodies.current.delete(tempId);
      } catch {
        setMessages((prev) => markFailed(prev, tempId));
      }
    },
    [conversationId, meId],
  );

  const retryMessage = useCallback(
    async (tempId: string) => {
      const info = pendingBodies.current.get(tempId);
      if (!info) return;
      // Drop the failed row, then send fresh.
      setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
      pendingBodies.current.delete(tempId);
      await sendMessage({ body: info.body, recipientId: info.recipientId });
    },
    [sendMessage],
  );

  return { messages, loading, sendMessage, retryMessage };
}
