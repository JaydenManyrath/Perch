"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Composer — single-line message input + send button. Autofocus on mount so
 * the connection-hero "Message now" flow lands in a ready-to-type state.
 */
export function Composer({
  onSend,
  autoFocus = false,
  placeholder = "Message…",
  disabled = false,
}: {
  onSend: (body: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function submit() {
    const body = value.trim();
    if (!body) return;
    onSend(body);
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1 rounded-2xl bg-white border border-sky-300 px-4 py-3 text-body text-ink-strong placeholder:text-ink-muted",
          "focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
        )}
        aria-label="Message"
      />
      <button
        type="submit"
        aria-label="Send message"
        disabled={disabled || value.trim().length === 0}
        className={cn(
          "h-12 w-12 rounded-2xl bg-sky-400 text-white flex items-center justify-center shadow-card",
          "hover:bg-sky-500 transition-colors",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        <Send className="h-5 w-5" aria-hidden />
      </button>
    </form>
  );
}
