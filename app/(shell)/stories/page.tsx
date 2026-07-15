import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Stories / perches — the shortlisted-sublets story tray. Phase 3 fills this in.
 */
export default function StoriesPage() {
  return (
    <div className="px-4 pt-4 md:pt-8">
      <header>
        <h1 className="text-h1 text-ink-strong">Perches</h1>
        <p className="text-caption text-ink-soft">
          Short-term sublets that fit a ~10-week internship.
        </p>
      </header>
      <EmptyState
        title="Save a perch"
        body="Any place you like lands into this tray — like a bird landing on a branch."
        variant="idle"
      />
    </div>
  );
}
