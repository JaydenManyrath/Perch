import { getConversationsForUser } from "@/lib/data/source";
import { ME_ID } from "@/lib/fixtures/users";
import { ConversationListItem } from "@/components/dms/ConversationListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default async function DMsPage() {
  const rows = await getConversationsForUser(ME_ID);

  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header>
        <h1 className="text-h1 text-ink-strong">DMs</h1>
        <p className="text-caption text-ink-soft">
          Live messages with your flock.
        </p>
      </header>

      <div className="mt-4">
        {rows.length === 0 ? (
          <EmptyState
            title="No conversations yet"
            body="Find your flock in Discovery — one tap and a real DM opens."
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
                  mineId={ME_ID}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
