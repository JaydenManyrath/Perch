"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { RefreshCw, MapPin } from "lucide-react";
import type { ListingRow } from "@/lib/types/contract";
import { confirmListing } from "@/lib/data/source";
import { formatMonthDay } from "@/lib/utils";

/**
 * SubletterListings (RA4) - a subletter's own listings with a Confirm/relist
 * affordance. Confirm hits POST /api/listings/{id}/confirm (fixture: flips
 * status back to 'available' and bumps expires_at).
 */
export function SubletterListings({ listings }: { listings: ListingRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your listings</CardTitle>
        <CardDescription>
          Confirm at least every 2 weeks so interns keep seeing your listing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {listings.length === 0 ? (
          <p className="text-caption text-ink-soft">No listings yet. Post one above.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {listings.map((l) => (
              <li key={l.id}>
                <Row listing={l} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ listing }: { listing: ListingRow }) {
  const [status, setStatus] = useState(listing.status ?? "available");
  const [lastConfirmed, setLastConfirmed] = useState(listing.last_confirmed_at ?? null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function onConfirm() {
    // Optimistic flip.
    const prevStatus = status;
    setStatus("available");
    setLastConfirmed(new Date().toISOString());
    startTransition(async () => {
      try {
        await confirmListing(listing.id);
        router.refresh();
      } catch {
        setStatus(prevStatus);
      }
    });
  }

  const needsConfirm = status === "pending" || status === "stale";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-sky-100 bg-white p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-ink-strong truncate">{listing.title}</span>
          <StatusBadge status={status} />
        </div>
        <p className="mt-0.5 text-caption text-ink-soft flex items-center gap-1 truncate">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden /> {listing.address}
        </p>
        <p className="text-caption text-ink-soft">
          ${listing.price.toLocaleString()}/mo - {formatMonthDay(listing.lease_start)} to{" "}
          {formatMonthDay(listing.lease_end)}
          {lastConfirmed
            ? ` - last confirmed ${new Date(lastConfirmed).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            : ""}
        </p>
      </div>
      <Button
        onClick={onConfirm}
        disabled={pending}
        variant={needsConfirm ? "primary" : "secondary"}
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        {pending ? "Confirming..." : needsConfirm ? "Confirm still available" : "Re-confirm"}
      </Button>
    </div>
  );
}
