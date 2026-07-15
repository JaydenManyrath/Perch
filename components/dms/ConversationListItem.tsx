import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import { BandedBadge } from "@/components/ui/BandedBadge";
import type { UserRow, MessageRow } from "@/lib/types/contract";

/**
 * ConversationListItem — one row in the DM list. Big tap target, peer avatar,
 * last-message preview, timestamp.
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
    <Link
      href={`/dms/${conversationId}`}
      className="flex items-center gap-3 rounded-2xl bg-white border border-sky-100 shadow-card p-3 hover:bg-sky-50 transition-colors"
    >
      <Avatar className="h-12 w-12">
        {peer.avatar_url ? <AvatarImage src={peer.avatar_url} alt="" /> : null}
        <AvatarFallback>{peer.name[0]}</AvatarFallback>
      </Avatar>
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
    </Link>
  );
}
