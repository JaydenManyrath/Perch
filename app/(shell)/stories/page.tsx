import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { getPerchDeck, getSavedPerches } from "@/lib/data/server-source";
import { StoriesClient } from "@/components/stories/StoriesClient";

export default async function StoriesPage({ searchParams }: { searchParams: { tab?: string } }) {
  const [deck, saved] = await Promise.all([getPerchDeck(), getSavedPerches()]);
  const initialTab = searchParams.tab === "saved" ? "saved" : "deck";

  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink-strong">Perches</h1>
          <p className="text-caption text-ink-soft">
            Swipe through fresh sublets. Right-swipe to save, left to pass. Tap for details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/post"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-2xl bg-white border border-sky-300 text-ink-strong text-caption font-semibold px-3 py-2 shadow-card hover:bg-sky-100 transition-colors"
          >
            <Home className="h-3.5 w-3.5" aria-hidden /> Post
          </Link>
          <Link
            href="/negotiate"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-2xl bg-accent-beak text-white text-caption font-semibold px-3 py-2 shadow-card hover:bg-accent-beakDeep transition-colors"
          >
            Negotiate <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      <StoriesClient
        initialDeck={deck.deck}
        initialSaved={saved}
        initialTab={initialTab}
      />
    </div>
  );
}
