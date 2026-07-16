"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ItineraryDayCard } from "@/components/landing/ItineraryDayCard";
import { X, MapPin, Route, Coffee, Dumbbell } from "lucide-react";
import type {
  GeoJSONLineString,
  ItineraryDay,
  ListingRow,
  RoutePoi,
} from "@/lib/types/contract";

/**
 * CommutePlanPanel (RA19) - the plan-your-commute UI shown next to the map
 * when an apartment is selected.
 *  1. Draws the office <-> apartment route on the map (parent supplies).
 *  2. Lets the user toggle POI kinds (coffee, gym).
 *  3. Lets the user pick specific POIs along the route.
 *  4. Shows a generated schedule.
 * A "Clear" button unpicks the apartment.
 */
export function CommutePlanPanel({
  apartment,
  distanceMeters,
  durationSeconds,
  loading,
  kinds,
  onKindsChange,
  pois,
  selectedIds,
  onTogglePoi,
  onBuildSchedule,
  schedule,
  onClear,
  routeGeometry,
}: {
  apartment: ListingRow | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  loading: boolean;
  kinds: Set<"coffee" | "gym">;
  onKindsChange: (next: Set<"coffee" | "gym">) => void;
  pois: RoutePoi[];
  selectedIds: Set<string>;
  onTogglePoi: (id: string) => void;
  onBuildSchedule: () => Promise<void> | void;
  schedule: ItineraryDay | null;
  onClear: () => void;
  routeGeometry: GeoJSONLineString | null;
}) {
  const [buildingSchedule, setBuildingSchedule] = useState(false);

  useEffect(() => {
    setBuildingSchedule(false);
  }, [schedule]);

  if (!apartment) return null;

  const durationMin = durationSeconds ? Math.round(durationSeconds / 60) : null;
  const distanceKm = distanceMeters ? (distanceMeters / 1000).toFixed(1) : null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Route className="h-4 w-4 text-accent-beak" aria-hidden />
              Plan the commute
            </CardTitle>
            <CardDescription>
              Office to <Link href={`/stories?tab=deck#${apartment.id}`} className="text-ink-strong font-semibold hover:underline">{apartment.title}</Link>.
              Pick stops along the route.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear commute plan">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-caption">
          <StatusBadge status={apartment.status ?? "available"} />
          <span className="inline-flex items-center gap-1 text-ink-soft">
            <MapPin className="h-3 w-3" aria-hidden /> {apartment.address}
          </span>
          {distanceKm && durationMin ? (
            <Chip tone="muted">
              {distanceKm} km - ~{durationMin} min
            </Chip>
          ) : (
            <Chip tone="muted">{loading ? "Loading route..." : routeGeometry ? "Route ready" : "No route"}</Chip>
          )}
        </div>

        <fieldset>
          <legend className="text-caption text-ink-soft mb-1">Stops along the route</legend>
          <div className="flex items-center gap-2">
            <KindToggle
              active={kinds.has("coffee")}
              onClick={() => {
                const next = new Set(kinds);
                if (next.has("coffee")) next.delete("coffee");
                else next.add("coffee");
                onKindsChange(next);
              }}
              icon={<Coffee className="h-3.5 w-3.5" aria-hidden />}
              label="Coffee"
            />
            <KindToggle
              active={kinds.has("gym")}
              onClick={() => {
                const next = new Set(kinds);
                if (next.has("gym")) next.delete("gym");
                else next.add("gym");
                onKindsChange(next);
              }}
              icon={<Dumbbell className="h-3.5 w-3.5" aria-hidden />}
              label="Gym"
            />
          </div>
        </fieldset>

        {pois.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {pois.map((p) => {
              const selected = selectedIds.has(p.place.id);
              return (
                <li key={p.place.id}>
                  <button
                    type="button"
                    onClick={() => onTogglePoi(p.place.id)}
                    aria-pressed={selected}
                    className={`w-full text-left flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                      selected
                        ? "border-func-pass bg-func-passBg"
                        : "border-sky-200 bg-white hover:bg-sky-50"
                    }`}
                  >
                    <span
                      className={`h-4 w-4 rounded-full border ${
                        selected ? "bg-func-pass border-func-pass" : "border-sky-300"
                      }`}
                      aria-hidden
                    />
                    <span className="flex-1 min-w-0">
                      <span className="text-body text-ink-strong font-semibold truncate block">
                        {p.place.label}
                      </span>
                      <span className="text-caption text-ink-soft">
                        {p.place.kind} - {Math.round(p.distanceFromRouteMeters)}m off route
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-caption text-ink-soft">
            Toggle a kind to see candidates. Pick a few and generate the day.
          </p>
        )}

        <div className="flex justify-end">
          <Button
            onClick={async () => {
              setBuildingSchedule(true);
              try {
                await onBuildSchedule();
              } finally {
                setBuildingSchedule(false);
              }
            }}
            disabled={selectedIds.size === 0 || buildingSchedule}
          >
            {buildingSchedule ? "Building..." : "Generate schedule"}
          </Button>
        </div>

        {schedule ? (
          <div className="mt-2">
            <ItineraryDayCard day={schedule} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function KindToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-caption font-semibold transition-colors ${
        active
          ? "bg-sky-100 border-sky-400 text-ink-strong"
          : "bg-white border-sky-300 text-ink-soft hover:text-ink-strong"
      }`}
    >
      {icon} {label}
    </button>
  );
}
