/**
 * Placeholder Mascot — real recolored SVGs + animations land in Phase 1.
 * Kept minimal here so Phase-0 imports resolve and the app boots.
 */
export function Mascot({ size = 120, caption }: { variant?: "idle" | "hop"; size?: number; caption?: string }) {
  return (
    <div className="inline-flex flex-col items-center gap-2" aria-label={caption ?? "Perch mascot"}>
      <div
        className="rounded-full bg-sky-200 border-2 border-sky-400"
        style={{ width: size, height: size }}
        aria-hidden
      />
      {caption ? <span className="text-caption text-ink-soft">{caption}</span> : null}
    </div>
  );
}
