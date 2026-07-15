"use client";

import Image from "next/image";
import type { ListingRow } from "@/lib/types/contract";
import { cn } from "@/lib/utils";

/**
 * PerchStory — one circular story bubble in the perches tray. Tap to open the
 * detail sheet.
 */
export function PerchStory({
  listing,
  onOpen,
  selected = false,
}: {
  listing: ListingRow;
  onOpen: () => void;
  selected?: boolean;
}) {
  const photo = listing.photos[0];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col items-center gap-1.5 min-w-[76px] focus:outline-none"
    >
      <span
        className={cn(
          "relative h-16 w-16 rounded-full p-[3px] bg-gradient-to-br from-sky-400 to-accent-beak",
          "group-focus-visible:ring-2 group-focus-visible:ring-sky-500 group-focus-visible:ring-offset-2",
          selected && "from-sky-500 to-accent-beakDeep"
        )}
      >
        <span className="block h-full w-full rounded-full bg-white p-[2px]">
          {photo ? (
            <Image
              src={photo}
              alt={listing.title}
              width={64}
              height={64}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="block h-full w-full rounded-full bg-sky-200" aria-hidden />
          )}
        </span>
      </span>
      <span className="text-[0.7rem] text-ink-strong font-semibold text-center leading-tight w-[76px] truncate">
        ${listing.price.toLocaleString()}
      </span>
    </button>
  );
}
