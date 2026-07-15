"use client";

import { useEffect, useRef } from "react";
import { useRealtimeMessages } from "@/lib/hooks/useRealtimeMessages";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * ConversationThread — the live DM thread. Owns the subscription + optimistic
 * send + retry via useRealtimeMessages (which uses the tested reconcile logic).
 */
export function ConversationThread({
  conversationId,
  meId,
  peerId,
  autoFocus = false,
}: {
  conversationId: string;
  meId: string;
  peerId: string;
  autoFocus?: boolean;
}) {
  const { messages, loading, sendMessage, retryMessage } = useRealtimeMessages(
    conversationId,
    meId,
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 bg-sky-50">
        {loading ? (
          <>
            <Skeleton className="h-10 w-56 self-start" />
            <Skeleton className="h-10 w-64 self-end" />
            <Skeleton className="h-10 w-40 self-start" />
          </>
        ) : messages.length === 0 ? (
          <div className="mt-8 text-center text-ink-soft text-body">
            No messages yet. Start the conversation.
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.tempId ?? m.id}
              message={m}
              mine={m.sender_id === meId}
              onRetry={retryMessage}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-sky-200 bg-white p-3">
        <Composer
          onSend={(body) => sendMessage({ body, recipientId: peerId })}
          autoFocus={autoFocus}
        />
      </div>
    </>
  );
}
