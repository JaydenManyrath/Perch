"use client";

import { cn } from "@/lib/utils";
import type { UIMessage } from "@/lib/hooks/reconcile";
import { AlertCircle, RotateCcw } from "lucide-react";

/**
 * MessageBubble — sender bubbles right-aligned in sky-400 on white; recipient
 * left-aligned in white on sky-100. Pending: dimmed; failed: red hairline
 * border + retry affordance.
 */
export function MessageBubble({
  message,
  mine,
  onRetry,
}: {
  message: UIMessage;
  mine: boolean;
  onRetry?: (tempId: string) => void;
}) {
  const time = new Date(message.created_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2 shadow-card",
          mine
            ? "bg-sky-400 text-white rounded-br-md"
            : "bg-white text-ink-strong border border-sky-200 rounded-bl-md",
          message.pending && "opacity-60",
          message.failed && "border-func-scam border"
        )}
      >
        <p className="text-body whitespace-pre-wrap break-words">{message.body}</p>
      </div>
      <div
        className={cn(
          "mt-0.5 text-[0.7rem] text-ink-soft flex items-center gap-2",
          mine ? "flex-row-reverse" : "flex-row"
        )}
      >
        <span>{time}</span>
        {message.pending ? <span>Sending…</span> : null}
        {message.failed ? (
          <>
            <span className="inline-flex items-center gap-1 text-func-scam font-semibold">
              <AlertCircle className="h-3 w-3" aria-hidden /> Failed
            </span>
            {onRetry && message.tempId ? (
              <button
                type="button"
                onClick={() => onRetry(message.tempId!)}
                className="inline-flex items-center gap-1 text-sky-500 hover:text-sky-600 font-semibold"
              >
                <RotateCcw className="h-3 w-3" aria-hidden /> Retry
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
