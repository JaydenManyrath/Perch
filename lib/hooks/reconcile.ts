import type { MessageRow } from "@/lib/types/contract";

/**
 * A message row as held in the DM UI — carries optional client-side flags for
 * optimistic send: `tempId` is the local id assigned before the DB row exists,
 * `pending` is true while awaiting the Realtime echo, and `failed` marks a
 * send that never made it (RLS reject, network drop).
 */
export type UIMessage = MessageRow & {
  tempId?: string;
  pending?: boolean;
  failed?: boolean;
};

/**
 * Reconcile a canonical `MessageRow` echo from Supabase Realtime with the
 * current UI message list.
 *
 * Rules (contract §5 flow — the reconcile detail that bites: since the sender
 * is also subscribed, you'll receive your OWN message back):
 *   1. If an existing UI row already has `id === echo.id`, skip — already there.
 *   2. Else if the echo matches a still-pending row from THIS sender by
 *      (sender_id + body), swap its `id`+`created_at` in place, clear `pending`
 *      and `tempId`. This dedupes the echo of our own send.
 *   3. Otherwise append the echo as a new message (a fresh row from the peer).
 *
 * Pure function: same input → same output. Tested against a fake channel.
 */
export function reconcile(existing: UIMessage[], echo: MessageRow): UIMessage[] {
  // Rule 1: dedupe if we already have this canonical id.
  if (existing.some((m) => m.id === echo.id)) {
    return existing;
  }

  // Rule 2: match a pending optimistic row from the same sender with same body.
  const idx = existing.findIndex(
    (m) =>
      m.pending &&
      !m.failed &&
      m.sender_id === echo.sender_id &&
      m.body === echo.body,
  );

  if (idx >= 0) {
    const swapped: UIMessage = {
      ...existing[idx],
      id: echo.id,
      created_at: echo.created_at,
      pending: false,
      tempId: undefined,
    };
    const next = existing.slice();
    next[idx] = swapped;
    return next;
  }

  // Rule 3: fresh message from the peer (or a resend we didn't optimistically add).
  return [...existing, echo];
}

/** Add an optimistic pending row for a locally-sent message. */
export function addPending(
  existing: UIMessage[],
  input: {
    conversation_id: string;
    sender_id: string;
    recipient_id: string;
    body: string;
    /** Client-generated temp id. */
    tempId: string;
    /** Wall-clock time at send. */
    now?: string;
  },
): UIMessage[] {
  const created_at = input.now ?? new Date().toISOString();
  const row: UIMessage = {
    id: input.tempId, // sentinel until Realtime echo reconciles
    tempId: input.tempId,
    conversation_id: input.conversation_id,
    sender_id: input.sender_id,
    recipient_id: input.recipient_id,
    body: input.body,
    created_at,
    pending: true,
  };
  return [...existing, row];
}

/** Mark a pending row as failed (network error / RLS reject). */
export function markFailed(existing: UIMessage[], tempId: string): UIMessage[] {
  return existing.map((m) =>
    m.tempId === tempId && m.pending
      ? { ...m, pending: false, failed: true }
      : m,
  );
}
