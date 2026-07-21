import { FriendsClient } from "@/components/friends/FriendsClient";
import { getFriends, getFriendRequests } from "@/lib/data/server-source";
import { BackButton } from "@/components/ui/BackButton";

/**
 * /friends (RA16) - accepted friends list + requests inbox.
 */
export default async function FriendsPage() {
  const [{ friends }, { requests }] = await Promise.all([
    getFriends(),
    getFriendRequests(),
  ]);
  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <BackButton fallbackHref="/dms" />
      <header className="mb-4">
        <h1 className="text-h1 text-ink-strong">Friends</h1>
        <p className="text-caption text-ink-soft">
          The interns you're mutually connected with, and any pending requests.
        </p>
      </header>
      <FriendsClient initialFriends={friends} initialRequests={requests} />
    </div>
  );
}
