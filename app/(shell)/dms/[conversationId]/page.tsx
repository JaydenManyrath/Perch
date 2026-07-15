import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getConversationsForUser } from "@/lib/data/source";
import { ME_ID } from "@/lib/fixtures/users";
import { ConversationThread } from "@/components/dms/ConversationThread";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import { BandedBadge } from "@/components/ui/BandedBadge";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: { conversationId: string };
  searchParams: { focus?: string };
}) {
  const convs = await getConversationsForUser(ME_ID);
  const conv = convs.find((c) => c.id === params.conversationId);
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
        <Avatar className="h-9 w-9">
          {conv.peer.avatar_url ? <AvatarImage src={conv.peer.avatar_url} alt="" /> : null}
          <AvatarFallback>{conv.peer.name[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink-strong truncate">
              {conv.peer.name}
            </span>
            {conv.peer.verified ? <BandedBadge size="sm" showLabel={false} /> : null}
          </div>
          <div className="text-caption text-ink-soft truncate">
            {conv.peer.role} at {conv.peer.company}
          </div>
        </div>
      </header>

      <ConversationThread
        conversationId={conv.id}
        meId={ME_ID}
        peerId={conv.peer.id}
        autoFocus={autoFocus}
      />
    </div>
  );
}
