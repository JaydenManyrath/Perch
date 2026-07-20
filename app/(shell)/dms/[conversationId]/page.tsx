import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getConversationsForUser,
  findOrCreateConversation,
  getUserById,
  participantsFromConversationId,
} from "@/lib/data/server-source";
import { getInitialSession } from "@/lib/auth/server-session";
import { ConversationThread } from "@/components/dms/ConversationThread";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { BandedBadge } from "@/components/ui/BandedBadge";

/**
 * /dms/[conversationId]
 * Two lookup paths so the URL alone is enough to render a thread:
 *  1. If the id matches a known conversation (seeded or previously created),
 *     use it.
 *  2. Otherwise, if the id is a deterministic pair id (conv-<uidA>__<uidB>),
 *     ensure the conversation exists on the server (create-on-demand) and
 *     render the thread. This is how the 'Message' button on a fresh profile
 *     survives a page navigation without shared client/server memory.
 */
export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: { conversationId: string };
  searchParams: { focus?: string };
}) {
  const session = await getInitialSession();
  const meId = session.currentUser?.id;
  if (!meId) return notFound();

  const convs = await getConversationsForUser(meId);
  let conv = convs.find((c) => c.id === params.conversationId);

  if (!conv) {
    const pair = participantsFromConversationId(params.conversationId);
    if (pair) {
      const [a, b] = pair;
      const peerId = a === meId ? b : b === meId ? a : null;
      if (peerId) {
        const created = await findOrCreateConversation(meId, peerId);
        const peer = await getUserById(peerId);
        if (peer) {
          conv = {
            ...created,
            peer,
            lastMessage: undefined,
          };
        }
      }
    }
  }

  if (!conv) return notFound();

  const autoFocus = searchParams.focus === "1";

  return (
    <div className="flex flex-col h-[calc(100dvh-56px-64px)] md:h-[calc(100dvh)] pt-0">
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-sky-200 sticky top-14 md:top-0 z-10">
        <Link
          href="/dms"
          className="p-1 rounded-full hover:bg-sky-100 text-ink-strong"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <Link
          href={`/profile/${conv.peer.id}`}
          className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label={`Open ${conv.peer.name}'s profile`}
        >
          <InitialsAvatar name={conv.peer.name} src={conv.peer.avatar_url} size={36} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${conv.peer.id}`}
              className="font-semibold text-ink-strong truncate hover:underline"
            >
              {conv.peer.name}
            </Link>
            {conv.peer.verified ? <BandedBadge size="sm" showLabel={false} /> : null}
          </div>
          <div className="text-caption text-ink-soft truncate">
            {conv.peer.role} at {conv.peer.company}
          </div>
        </div>
      </header>

      <ConversationThread
        conversationId={conv.id}
        meId={meId}
        peerId={conv.peer.id}
        autoFocus={autoFocus}
      />
    </div>
  );
}
