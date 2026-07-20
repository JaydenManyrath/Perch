"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Chip } from "@/components/ui/Chip";
import { acceptFriend, declineFriend } from "@/lib/data/source";
import { Check, X, Send } from "lucide-react";
import type { Friend } from "@/lib/types/contract";
import { cn } from "@/lib/utils";

/**
 * FriendsClient (RA16) - two tabs: accepted friends + incoming/outgoing
 * requests. Accept moves an incoming request into friends; decline drops it.
 */
export function FriendsClient({
  initialFriends,
  initialRequests,
}: {
  initialFriends: Friend[];
  initialRequests: Friend[];
}) {
  const [tab, setTab] = useState<"friends" | "requests">(
    initialRequests.some((r) => r.direction === "incoming") ? "requests" : "friends",
  );
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [requests, setRequests] = useState<Friend[]>(initialRequests);
  const [busy, setBusy] = useState<string | null>(null);

  const incoming = requests.filter((r) => r.direction === "incoming");
  const outgoing = requests.filter((r) => r.direction === "outgoing");

  async function onAccept(userId: string) {
    setBusy(userId);
    try {
      const f = await acceptFriend(userId);
      if (f) {
        setFriends((prev) => (prev.some((x) => x.user.id === f.user.id) ? prev : [...prev, f]));
        setRequests((prev) => prev.filter((r) => r.user.id !== userId));
      }
    } finally {
      setBusy(null);
    }
  }

  async function onDecline(userId: string) {
    setBusy(userId);
    try {
      await declineFriend(userId);
      setRequests((prev) => prev.filter((r) => r.user.id !== userId));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex items-center gap-2 border-b border-sky-200">
        <TabButton active={tab === "friends"} onClick={() => setTab("friends")}>
          Friends
          <span className="ml-1 text-caption text-ink-soft font-normal">
            {friends.length}
          </span>
        </TabButton>
        <TabButton active={tab === "requests"} onClick={() => setTab("requests")}>
          Requests
          <span className="ml-1 text-caption text-ink-soft font-normal">
            {incoming.length + outgoing.length}
          </span>
        </TabButton>
      </div>

      {tab === "friends" ? (
        friends.length === 0 ? (
          <EmptyState
            title="No friends yet"
            body="Add someone from Discovery or from a profile."
            action={
              <Button asChild>
                <Link href="/discovery">Open Discovery</Link>
              </Button>
            }
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your flock</CardTitle>
              <CardDescription>Accepted friend connections.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {friends.map((f) => (
                  <li key={f.user.id}>
                    <PersonRow friend={f} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Incoming requests</CardTitle>
              <CardDescription>People who want to add you.</CardDescription>
            </CardHeader>
            <CardContent>
              {incoming.length === 0 ? (
                <p className="text-caption text-ink-soft">No incoming requests.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {incoming.map((r) => (
                    <li key={r.user.id}>
                      <PersonRow friend={r}>
                        <Button size="sm" onClick={() => onAccept(r.user.id)} disabled={busy === r.user.id}>
                          <Check className="h-4 w-4" aria-hidden strokeWidth={2.5} /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onDecline(r.user.id)}
                          disabled={busy === r.user.id}
                        >
                          <X className="h-4 w-4" aria-hidden /> Decline
                        </Button>
                      </PersonRow>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sent requests</CardTitle>
              <CardDescription>Awaiting the other person.</CardDescription>
            </CardHeader>
            <CardContent>
              {outgoing.length === 0 ? (
                <p className="text-caption text-ink-soft">No outgoing requests.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {outgoing.map((r) => (
                    <li key={r.user.id}>
                      <PersonRow friend={r}>
                        <Chip tone="muted">
                          <Send className="h-3 w-3" aria-hidden /> Sent
                        </Chip>
                      </PersonRow>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-3 py-2 text-caption font-semibold border-b-2 -mb-px",
        active
          ? "border-sky-500 text-ink-strong"
          : "border-transparent text-ink-soft hover:text-ink-strong",
      )}
    >
      {children}
    </button>
  );
}

function PersonRow({ friend, children }: { friend: Friend; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white border border-sky-100 shadow-card p-3">
      <Link
        href={`/profile/${friend.user.id}`}
        aria-label={`Open ${friend.user.name}'s profile`}
        className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <InitialsAvatar name={friend.user.name} src={friend.user.avatarUrl} size={44} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/profile/${friend.user.id}`}
          className="text-body font-semibold text-ink-strong hover:underline block truncate"
        >
          {friend.user.name}
        </Link>
        <p className="text-caption text-ink-soft truncate">{friend.user.company}</p>
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}
