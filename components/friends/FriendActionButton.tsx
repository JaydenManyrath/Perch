"use client";

import { useEffect, useState } from "react";
import { UserPlus, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Friend } from "@/lib/types/contract";
import {
  getFriends,
  getFriendRequests,
  requestFriend,
  acceptFriend,
} from "@/lib/data/source";

/**
 * FriendActionButton (RA16) - adds friend on other-user profiles and on
 * match cards. Reads the current friendship state and shows the right CTA.
 */
export function FriendActionButton({ userId }: { userId: string }) {
  const [state, setState] = useState<"loading" | "friend" | "incoming" | "outgoing" | "none">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ friends }, { requests }] = await Promise.all([
        getFriends(),
        getFriendRequests(),
      ]);
      if (cancelled) return;
      if (friends.some((f) => f.user.id === userId)) return setState("friend");
      const req = requests.find((f) => f.user.id === userId);
      if (req?.direction === "incoming") return setState("incoming");
      if (req?.direction === "outgoing") return setState("outgoing");
      return setState("none");
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function onAdd() {
    setBusy(true);
    try {
      const r: Friend | null = await requestFriend(userId);
      if (r) setState("outgoing");
    } finally {
      setBusy(false);
    }
  }

  async function onAccept() {
    setBusy(true);
    try {
      const r: Friend | null = await acceptFriend(userId);
      if (r) setState("friend");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;
  if (state === "friend") {
    return (
      <Button variant="secondary" size="sm" disabled>
        <Check className="h-4 w-4" aria-hidden strokeWidth={2.5} /> Friends
      </Button>
    );
  }
  if (state === "outgoing") {
    return (
      <Button variant="secondary" size="sm" disabled>
        <Clock className="h-4 w-4" aria-hidden /> Requested
      </Button>
    );
  }
  if (state === "incoming") {
    return (
      <Button size="sm" onClick={onAccept} disabled={busy}>
        <Check className="h-4 w-4" aria-hidden strokeWidth={2.5} /> Accept
      </Button>
    );
  }
  return (
    <Button size="sm" onClick={onAdd} disabled={busy}>
      <UserPlus className="h-4 w-4" aria-hidden /> Add friend
    </Button>
  );
}
