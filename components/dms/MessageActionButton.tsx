"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useConversation } from "@/lib/hooks/useConversation";
import { useCurrentUser } from "@/lib/auth/session";

/**
 * MessageActionButton - opens (or creates) a DM with the given user and jumps to
 * the thread with the composer auto-focused. Same flow the connection hero uses
 * from MatchCard - reused here so any profile is one tap away from a message.
 */
export function MessageActionButton({
  userId,
  label = "Message",
  variant = "primary",
  size = "sm",
}: {
  userId: string;
  label?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const { createOrOpen } = useConversation();
  const { currentUser } = useCurrentUser();
  const [busy, setBusy] = useState(false);

  async function open() {
    if (busy || !currentUser || userId === currentUser.id) return;
    setBusy(true);
    try {
      const conv = await createOrOpen(currentUser.id, userId);
      router.push(`/dms/${conv.id}?focus=1`);
    } finally {
      setTimeout(() => setBusy(false), 1500);
    }
  }

  if (userId === currentUser?.id) return null;

  return (
    <Button
      onClick={open}
      disabled={busy || !currentUser}
      variant={variant}
      size={size}
      aria-label={label}
    >
      <Send className="h-4 w-4" aria-hidden />
      {busy ? "Opening..." : label}
    </Button>
  );
}
