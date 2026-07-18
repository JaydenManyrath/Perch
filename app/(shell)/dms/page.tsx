"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { getConversationsForUser, getFriendNotes } from "@/lib/data/source";
import { ME_ID } from "@/lib/fixtures/users";
import { useCurrentUser } from "@/lib/auth/session";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { ConversationListItem } from "@/components/dms/ConversationListItem";
import { NotesStrip } from "@/components/dms/NotesStrip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { ConversationRow, FriendNote, MessageRow, UserRow } from "@/lib/types/contract";

/**
 * /dms - Client component (RA6/RA17 finish).
 *
 * Made client-side deliberately so the list stays in sync with the CLIENT's
 * fixture after createOrOpen/insertMessage without fighting Next.js's router
 * cache. The server-rendered version was serving a stale list after a Message
 * click, hiding freshly-created conversations. In live mode the same code
 * calls the /api/... routes; in fixture mode it reads the in-memory arrays
 * the client's createOrOpen mutated.
 */
export default function DMsPage() {
  const { currentUser, mode } = useCurrentUser();
  const [rows, setRows] = useState<
    Array<ConversationRow & { peer: UserRow; lastMessage?: MessageRow }>
  >([]);
  const [notes, setNotes] = useState<FriendNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const userId = currentUser?.id ?? ME_ID;

    async function loadLiveRows() {
      const supabase = getSupabaseBrowser();
      if (mode !== "live" || !supabase || !currentUser) return null;

      const { data: conversations, error: conversationsError } = await supabase
        .from("conversations")
        .select("*")
        .contains("participant_ids", [currentUser.id])
        .order("last_message_at", { ascending: false });
      if (conversationsError || !conversations) return null;
      if (conversations.length === 0) return [];

      const peerIds = Array.from(
        new Set(
          conversations.flatMap((conversation) =>
            (conversation.participant_ids as string[]).filter((id) => id !== currentUser.id),
          ),
        ),
      );
      const [{ data: peers, error: peersError }, { data: messages, error: messagesError }] =
        await Promise.all([
          supabase.from("users").select("*").in("id", peerIds),
          supabase
            .from("messages")
            .select("*")
            .in("conversation_id", conversations.map((conversation) => conversation.id))
            .order("created_at", { ascending: false }),
        ]);
      if (peersError || messagesError || !peers || !messages) return null;

      const peersById = new Map(peers.map((peer) => [peer.id, peer as UserRow]));
      const lastMessageByConversation = new Map<string, MessageRow>();
      for (const message of messages as MessageRow[]) {
        if (!lastMessageByConversation.has(message.conversation_id)) {
          lastMessageByConversation.set(message.conversation_id, message);
        }
      }

      return conversations.flatMap((conversation) => {
        const peerId = (conversation.participant_ids as string[]).find((id) => id !== currentUser.id);
        const peer = peerId ? peersById.get(peerId) : undefined;
        return peer
          ? [{ ...(conversation as ConversationRow), peer, lastMessage: lastMessageByConversation.get(conversation.id) }]
          : [];
      });
    }

    Promise.all([loadLiveRows(), getConversationsForUser(userId), getFriendNotes()])
      .then(([liveRows, fixtureRows, n]) => {
        if (cancelled) return;
        setRows(liveRows ?? fixtureRows);
        setNotes(n.notes);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser, mode]);

  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink-strong">DMs</h1>
          <p className="text-caption text-ink-soft">
            Live messages with your flock.
          </p>
        </div>
        <Link
          href="/friends"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-2xl bg-white border border-sky-300 text-ink-strong text-caption font-semibold px-3 py-2 shadow-card hover:bg-sky-100 transition-colors"
        >
          <Users className="h-3.5 w-3.5" aria-hidden /> Friends
        </Link>
      </header>

      <div className="mt-4">
        <NotesStrip notes={notes} />
        {loading ? (
          <p className="text-caption text-ink-soft mt-4">Loading conversations...</p>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No conversations yet"
            body="Find your flock in Discovery - one tap and a real DM opens."
            action={
              <Button asChild>
                <Link href="/discovery">Open Discovery</Link>
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.id}>
                <ConversationListItem
                  conversationId={r.id}
                  peer={r.peer}
                  lastMessage={r.lastMessage}
                  mineId={currentUser?.id ?? ME_ID}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
