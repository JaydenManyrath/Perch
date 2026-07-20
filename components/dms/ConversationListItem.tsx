import Link from "next/link";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { BandedBadge } from "@/components/ui/BandedBadge";
import type { UserRow, MessageRow } from "@/lib/types/contract";

/**
 * ConversationListItem - one row in the DM list. Big tap target, peer avatar,
 * last-message preview, timestamp. Round 2 (RA6): the peer avatar links to
 * their profile in addition to the row linking to the conversation.
 */
export function ConversationListItem({
  conversationId,
  peer,
  lastMessage,
  mineId,
}: {
  conversationId: string;
  peer: UserRow;
  lastMessage?: MessageRow;
  mineId: string;
}) {
  const preview = lastMessage
    ? `${lastMessage.sender_id === mineId ? "You: " : ""}${lastMessage.body}`
    : "Say hi to your flock.";
  const when = lastMessage
    ? new Date(lastMessage.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div className="relative flex items-center gap-3 rounded-2xl bg-white border border-sky-100 shadow-card p-3 hover:bg-sky-50 transition-colors">
      {/* Avatar - clickable to profile (RA6). */}
      <Link
        href={`/profile/${peer.id}`}
        aria-label={`Open ${peer.name}'s profile`}
        className="relative z-10 shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <InitialsAvatar name={peer.name} src={peer.avatar_url} size={48} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-ink-strong truncate">{peer.name}</span>
            {peer.verified ? <BandedBadge size="sm" showLabel={false} /> : null}
          </div>
          <span className="text-caption text-ink-soft shrink-0">{when}</span>
        </div>
        <p className="mt-0.5 text-caption text-ink-soft truncate">{preview}</p>
      </div>
      {/* The whole row is the conversation link; sits below the avatar link. */}
      <Link
        href={`/dms/${conversationId}`}
        aria-label={`Open conversation with ${peer.name}`}
        className="absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      />
    </div>
  );
}
