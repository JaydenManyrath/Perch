import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import type { FeedItem } from "@/lib/types/contract";
import { formatEventTime } from "@/lib/utils";
import { MapPin, Sparkles } from "lucide-react";

/**
 * EventCard — one Flyway feed row. Renders event title, datetime, category,
 * a taste-score bar, and the LLM `reason` as a chip. Decision surface, so
 * no mascot here — the card is information-first (CLAUDE.md §9).
 */
export function EventCard({ item, topPick = false }: { item: FeedItem; topPick?: boolean }) {
  const pct = Math.round(item.tasteScore * 100);
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{item.event.title}</CardTitle>
            <CardDescription className="mt-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden />
              <span>{formatEventTime(item.event.datetime)}</span>
            </CardDescription>
          </div>
          {topPick ? (
            <Chip tone="accent" className="shrink-0">
              <Sparkles className="h-3 w-3" aria-hidden /> Top pick
            </Chip>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 flex-wrap">
          <Chip>{item.event.category}</Chip>
          <span className="text-caption text-ink-soft">
            match {pct}%
          </span>
          <div className="h-1.5 flex-1 min-w-24 rounded-full bg-sky-100 overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full"
              style={{ width: `${pct}%` }}
              aria-hidden
            />
          </div>
        </div>
        <p className="mt-3 text-body text-ink-strong">{item.reason}</p>
      </CardContent>
    </Card>
  );
}
