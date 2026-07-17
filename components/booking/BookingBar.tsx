"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, Check, X, Clock, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import {
  getBookings,
  requestBooking,
  confirmBooking,
  inviteRoommate,
  getFriends,
} from "@/lib/data/source";
import { ME_ID } from "@/lib/fixtures/users";
import type { Booking, Friend, PerchCard } from "@/lib/types/contract";
import { cn } from "@/lib/utils";

/**
 * BookingBar (RA34 + RA33) - sits on the perch detail sheet.
 * Shows the booking status if I already have one on this listing, and
 * exposes Request-to-book / Confirm / Add-roommate actions per state.
 * Decision surface - no mascot.
 */
export function BookingBar({
  listing,
  className,
  onBooked,
}: {
  listing: PerchCard;
  className?: string;
  onBooked?: (booking: Booking) => void;
}) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBookings(ME_ID)
      .then(({ mine }) => {
        if (cancelled) return;
        const b = mine.find(
          (x) => x.listingId === listing.id && x.status !== "declined" && x.status !== "cancelled",
        );
        setBooking(b ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listing.id]);

  async function loadFriends() {
    if (friends.length > 0) return;
    const { friends: f } = await getFriends();
    setFriends(f);
  }

  async function onRequest() {
    setBusy(true);
    try {
      const b = await requestBooking(listing.id, {});
      setBooking(b);
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    if (!booking) return;
    setBusy(true);
    try {
      const b = await confirmBooking(booking.id);
      if (b) {
        setBooking(b);
        if (b.status === "booked") onBooked?.(b);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onAddRoommate(userId: string) {
    if (!booking) return;
    setBusy(true);
    try {
      const b = await inviteRoommate(booking.id, userId);
      if (b) setBooking(b);
      setShowFriends(false);
    } finally {
      setBusy(false);
    }
  }

  const takenByOther = listing.status === "taken" && !booking;

  return (
    <section
      className={cn(
        "rounded-2xl border border-sky-200 bg-white p-3 shadow-card",
        className,
      )}
    >
      {loading ? (
        <p className="text-caption text-ink-soft">Loading booking status...</p>
      ) : takenByOther ? (
        <div className="flex items-center gap-2">
          <Chip>
            <Home className="h-3 w-3" aria-hidden /> Taken
          </Chip>
          <p className="text-caption text-ink-soft">
            Someone else booked this one. It won't show in the deck anymore.
          </p>
        </div>
      ) : !booking ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body font-semibold text-ink-strong">
              Ready to claim it?
            </p>
            <p className="text-caption text-ink-soft">
              Sends a request to the host. They approve, you confirm.
            </p>
          </div>
          <Button onClick={onRequest} disabled={busy}>
            <Home className="h-4 w-4" aria-hidden />
            Request to book
          </Button>
        </div>
      ) : booking.status === "requested" ? (
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill status="requested" />
            <p className="text-caption text-ink-soft">
              Waiting on the host to approve.
            </p>
          </div>
          <RoommateGroup
            booking={booking}
            onOpenFriends={() => {
              void loadFriends();
              setShowFriends((v) => !v);
            }}
            showFriends={showFriends}
            friends={friends}
            onPickFriend={onAddRoommate}
            busy={busy}
          />
        </div>
      ) : booking.status === "approved" ? (
        <div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <StatusPill status="approved" />
              <p className="text-caption text-ink-soft">
                Host said yes - confirm to lock it in.
              </p>
            </div>
            <Button onClick={onConfirm} disabled={busy} variant="accent">
              <Check className="h-4 w-4" aria-hidden strokeWidth={2.5} />
              Confirm booking
            </Button>
          </div>
          <RoommateGroup
            booking={booking}
            onOpenFriends={() => {
              void loadFriends();
              setShowFriends((v) => !v);
            }}
            showFriends={showFriends}
            friends={friends}
            onPickFriend={onAddRoommate}
            busy={busy}
          />
        </div>
      ) : booking.status === "booked" ? (
        <div>
          <div className="flex items-center gap-2">
            <StatusPill status="booked" />
            <p className="text-caption text-ink-strong font-semibold">
              You've got the place.
            </p>
          </div>
          <RoommateGroup
            booking={booking}
            onOpenFriends={() => {
              void loadFriends();
              setShowFriends((v) => !v);
            }}
            showFriends={showFriends}
            friends={friends}
            onPickFriend={onAddRoommate}
            busy={busy}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <StatusPill status={booking.status} />
          <p className="text-caption text-ink-soft">
            {booking.status === "declined"
              ? "The host declined - swipe next."
              : "This booking was cancelled."}
          </p>
        </div>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: Booking["status"] }) {
  if (status === "requested") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-func-flag bg-func-flagBg text-ink-strong text-caption font-semibold px-2 py-0.5">
        <Clock className="h-3 w-3" aria-hidden /> Requested
      </span>
    );
  }
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
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white border border-sky-200 text-ink-strong text-caption font-semibold px-2 py-0.5">
      <X className="h-3 w-3" aria-hidden /> {status}
    </span>
  );
}

function RoommateGroup({
  booking,
  onOpenFriends,
  showFriends,
  friends,
  onPickFriend,
  busy,
}: {
  booking: Booking;
  onOpenFriends: () => void;
  showFriends: boolean;
  friends: Friend[];
  onPickFriend: (userId: string) => void;
  busy: boolean;
}) {
  const remainingFriends = friends.filter(
    (f) => !booking.roommates.some((r) => r.id === f.user.id),
  );
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption text-ink-strong font-semibold">
          {booking.roommates.length > 0 ? "Roommates" : "Add a roommate"}
        </p>
        <button
          type="button"
          onClick={onOpenFriends}
          aria-expanded={showFriends}
          className="inline-flex items-center gap-1 rounded-lg text-caption font-semibold text-ink-strong underline decoration-sky-300 underline-offset-2 hover:decoration-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          <UserPlus className="h-3 w-3" aria-hidden />
          {showFriends ? "Cancel" : "Add"}
        </button>
      </div>

      {booking.roommates.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {booking.roommates.map((r) => (
            <li
              key={r.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 border border-sky-200 px-2 py-0.5 text-caption text-ink-strong font-semibold"
            >
              <Avatar className="h-5 w-5">
                {r.avatarUrl ? <AvatarImage src={r.avatarUrl} alt="" /> : null}
                <AvatarFallback>{r.name[0]}</AvatarFallback>
              </Avatar>
              {r.name}
            </li>
          ))}
        </ul>
      ) : null}

      {showFriends ? (
        <div className="mt-2 rounded-xl border border-sky-200 bg-sky-50 p-2">
          {remainingFriends.length === 0 ? (
            <p className="text-caption text-ink-soft">
              No more friends to invite.{" "}
              <Link href="/friends" className="text-ink-strong underline decoration-sky-300 underline-offset-2 hover:decoration-sky-500 font-semibold">
                Manage friends
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {remainingFriends.map((f) => (
                <li key={f.user.id}>
                  <button
                    type="button"
                    onClick={() => onPickFriend(f.user.id)}
                    disabled={busy}
                    className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white text-left disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <Avatar className="h-7 w-7">
                      {f.user.avatarUrl ? <AvatarImage src={f.user.avatarUrl} alt="" /> : null}
                      <AvatarFallback>{f.user.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-semibold text-ink-strong truncate">
                        {f.user.name}
                      </span>
                      <span className="block text-caption text-ink-soft truncate">
                        {f.user.company}
                      </span>
                    </span>
                    <UserPlus
                      className="h-4 w-4 text-ink-strong shrink-0"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
