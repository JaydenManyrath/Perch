"use client";

import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import type { FriendNote } from "@/lib/types/contract";
import { formatMonthDay } from "@/lib/utils";

/**
 * NotesStrip (RA17) - Instagram-Notes-style bubbles above the DMs list.
 * Shows friends who are going to an event. Tapping a bubble opens the
 * friend's profile.
 */
export function NotesStrip({ notes }: { notes: FriendNote[] }) {
  if (notes.length === 0) return null;
  return (
    <section aria-label="Friends going to events" className="mb-3">
      <p className="text-caption text-ink-soft mb-1.5 px-1">Notes from friends</p>
      <div className="overflow-x-auto -mx-4 px-4">
        <ul className="flex items-start gap-4 min-w-max pb-2">
          {notes.map((n) => (
            <li key={`${n.friend.id}-${n.event.id}`}>
              <NoteBubble note={n} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function NoteBubble({ note }: { note: FriendNote }) {
  const firstName = note.friend.name.split(" ")[0];
  return (
    <Link
      href={`/profile/${note.friend.id}`}
      className="group flex flex-col items-center gap-1.5 min-w-[112px] max-w-[128px] focus:outline-none"
    >
      <div className="relative">
        {/* Speech bubble with the event snippet */}
        <div className="mb-1 max-w-[132px] rounded-2xl rounded-bl-md bg-white border border-sky-200 shadow-card px-2.5 py-1.5">
          <p className="text-[0.7rem] leading-tight text-ink-strong font-semibold line-clamp-2">
            Going to {note.event.title}
          </p>
          <p className="text-[0.65rem] text-ink-soft">{formatMonthDay(note.event.datetime)}</p>
        </div>
        <Avatar className="h-14 w-14 mx-auto ring-2 ring-sky-300 ring-offset-2 ring-offset-sky-50 group-focus-visible:ring-sky-500">
          {note.friend.avatarUrl ? <AvatarImage src={note.friend.avatarUrl} alt="" /> : null}
          <AvatarFallback>{note.friend.name[0]}</AvatarFallback>
        </Avatar>
      </div>
      <span className="text-caption text-ink-strong font-semibold truncate w-full text-center">
        {firstName}
      </span>
    </Link>
  );
}
