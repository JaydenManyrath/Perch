"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { getConversationsForUser, getFriendNotes } from "@/lib/data/source";
import { useCurrentUser } from "@/lib/auth/session";
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
  const { currentUser } = useCurrentUser();
  const [rows, setRows] = useState<
    Array<ConversationRow & { peer: UserRow; lastMessage?: MessageRow }>
  >([]);
  const [notes, setNotes] = useState<FriendNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([getConversationsForUser(currentUser.id), getFriendNotes()])
      .then(([conversationRows, n]) => {
        if (cancelled) return;
        setRows(conversationRows);
        setNotes(n.notes);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink-strong">Chirps</h1>
          <p className="text-caption text-ink-soft">
            Your DMs - live messages with your flock.
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
                  mineId={currentUser?.id ?? ""}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
