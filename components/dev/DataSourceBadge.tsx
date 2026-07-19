"use client";

import { currentMode } from "@/lib/data/source";

export function DataSourceBadge() {
  if (process.env.NODE_ENV !== "development") return null;

  const mode = currentMode();
  return (
    <div
      className="pointer-events-none fixed bottom-20 right-3 z-50 rounded-full border border-sky-300 bg-white/95 px-2.5 py-1 font-mono text-[11px] font-semibold text-ink-soft shadow-card md:bottom-3"
      aria-label={`Development data source: ${mode}`}
    >
      Data: {mode}
    </div>
  );
}
