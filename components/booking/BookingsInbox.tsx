"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Check, X, Clock } from "lucide-react";
import { approveBooking, declineBooking, getBookings, getListings } from "@/lib/data/source";
import type { Booking, ListingRow } from "@/lib/types/contract";
import { formatMonthDay } from "@/lib/utils";

/**
 * BookingsInbox (RA34) - subletter's incoming-booking inbox.
 * Renders one row per incoming Booking against a listing the subletter owns,
 * with Approve / Decline actions. Once approved, the booker confirms from
 * their PerchDetailSheet to flip status='taken'.
 */
export function BookingsInbox({ subletterId }: { subletterId: string }) {
  const [rows, setRows] = useState<Booking[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ incoming }, ls] = await Promise.all([getBookings(subletterId), getListings()]);
    setRows(incoming);
    setListings(ls);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    load().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subletterId]);

  async function onApprove(id: string) {
    setBusy(id);
    try {
      await approveBooking(id);
      await load();
    } finally {
      setBusy(null);
    }
  }
  async function onDecline(id: string) {
    setBusy(id);
    try {
      await declineBooking(id);
      await load();
    } finally {
      setBusy(null);
    }
  }

  const pending = rows.filter((r) => r.status === "requested");
  const decided = rows.filter((r) => r.status !== "requested");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incoming bookings</CardTitle>
        <CardDescription>
          Requests to book your listings. Approve and the booker confirms to lock it in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-caption text-ink-soft">Loading...</p>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No booking requests"
            body="Requests to book your listings will show up here."
          />
        ) : (
          <>
            {pending.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {pending.map((b) => (
                  <li key={b.id}>
                    <Row
                      booking={b}
                      listing={listings.find((l) => l.id === b.listingId)}
                      busy={busy === b.id}
                      onApprove={onApprove}
                      onDecline={onDecline}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-caption text-ink-soft">No pending requests.</p>
            )}
            {decided.length > 0 ? (
              <div className="mt-4">
                <h4 className="text-caption text-ink-soft font-semibold mb-1">
                  Decided ({decided.length})
                </h4>
                <ul className="flex flex-col gap-2">
                  {decided.map((b) => (
                    <li key={b.id}>
                      <Row
                        booking={b}
                        listing={listings.find((l) => l.id === b.listingId)}
                        busy={false}
                        onApprove={onApprove}
                        onDecline={onDecline}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  booking,
  listing,
  busy,
  onApprove,
  onDecline,
}: {
  booking: Booking;
  listing: ListingRow | undefined;
  busy: boolean;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const listingTitle = listing?.title ?? "(unknown listing)";
  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-3 shadow-card">
      <div className="flex items-center gap-3">
        <Link
          href={`/profile/${booking.booker.id}`}
          aria-label={`Open ${booking.booker.name}'s profile`}
          className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <Avatar className="h-10 w-10">
            {booking.booker.avatarUrl ? (
              <AvatarImage src={booking.booker.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{booking.booker.name[0]}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <Link
              href={`/profile/${booking.booker.id}`}
              className="text-body font-semibold text-ink-strong truncate hover:underline"
            >
              {booking.booker.name}
            </Link>
            <StatusPill status={booking.status} />
          </div>
          <p className="text-caption text-ink-soft truncate">
            Wants: {listingTitle}
            {listing ? ` - $${listing.price.toLocaleString()}/mo` : ""}
          </p>
          <p className="text-caption text-ink-soft">
            {formatMonthDay(booking.createdAt)}
            {booking.roommates.length > 0
              ? ` - with ${booking.roommates.map((r) => r.name).join(", ")}`
              : ""}
          </p>
        </div>
      </div>
      {booking.status === "requested" ? (
        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDecline(booking.id)}
            disabled={busy}
          >
            <X className="h-4 w-4" aria-hidden /> Decline
          </Button>
          <Button size="sm" onClick={() => onApprove(booking.id)} disabled={busy}>
            <Check className="h-4 w-4" aria-hidden strokeWidth={2.5} /> Approve
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: Booking["status"] }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-100 text-ink-strong text-caption font-semibold px-2 py-0.5">
        <Check className="h-3 w-3" aria-hidden strokeWidth={2.5} /> Approved
      </span>
    );
  }
  if (status === "booked") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-func-pass bg-func-passBg text-ink-strong text-caption font-semibold px-2 py-0.5">
        <Check className="h-3 w-3" aria-hidden strokeWidth={2.5} /> Booked
      </span>
    );
  }
  if (status === "requested") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-func-flag bg-func-flagBg text-ink-strong text-caption font-semibold px-2 py-0.5">
        <Clock className="h-3 w-3" aria-hidden /> Requested
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white border border-sky-200 text-ink-strong text-caption font-semibold px-2 py-0.5">
      {status}
    </span>
  );
}
