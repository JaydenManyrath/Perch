import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Map — Mapbox render + life-map pins + positive-only stickers. Phase 5.
 */
export default function MapPage() {
  return (
    <div className="px-4 pt-4 md:pt-8">
      <header>
        <h1 className="text-h1 text-ink-strong">Map</h1>
        <p className="text-caption text-ink-soft">
          Your places, the walk from your sublet, and community vibe stickers.
        </p>
      </header>
      <EmptyState
        title="Landing your map"
        body="The map lands in Phase 5."
        variant="hop"
      />
    </div>
  );
}
