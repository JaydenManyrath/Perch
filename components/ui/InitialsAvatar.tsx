"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * InitialsAvatar (RA53) - the single, fallback-safe avatar for every render site.
 *
 * Profile pictures are optional in Perch (contract 15.2): `users.avatar_url` is
 * nullable and NOTHING may require an avatar. This component guarantees a null,
 * empty, or broken `src` never renders as an empty circle or a broken image - it
 * falls back to the person's initials on a baby-blue token background.
 *
 * Sizing is by prop: pass `size` (px) for fixed sizes (initials scale with it), or
 * `className` (e.g. `h-20 w-20 sm:h-24 sm:w-24`) for responsive sizes. The avatar is
 * decorative - every call site shows the person's name in adjacent text, so the
 * image carries `alt=""`.
 */

// Token backgrounds (contract section 3). All three clear WCAG AA (>= 4.5:1)
// against ink.strong initials, so a deterministic pick never costs legibility.
const TONES = ["bg-sky-200", "bg-sky-300", "bg-sky-100"] as const;

/** First-letter of first name + first-letter of last name, safe on empty input. */
export function initialsFromName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  const initials = (first + last).toUpperCase().trim();
  return initials || "?";
}

/** Deterministic token background so a given name always gets the same tone. */
export function avatarToneFor(name: string | null | undefined): string {
  const key = (name ?? "").trim();
  if (!key) return TONES[0];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return TONES[Math.abs(hash) % TONES.length];
}

export type InitialsAvatarProps = {
  /** Person's display name - drives the initials fallback and the tone. */
  name: string;
  /** Image URL. Null/empty/broken all fall back to initials. */
  src?: string | null;
  /** Pixel size for a fixed square avatar; also scales the initials. */
  size?: number;
  /** Extra root classes (ring, margins, or responsive height/width classes when size is omitted). */
  className?: string;
  /** Override the initials text styling (e.g. `text-h1`) when not using `size`. */
  fallbackClassName?: string;
  /** Alt text for the image; decorative by default. */
  alt?: string;
};

export function InitialsAvatar({
  name,
  src,
  size,
  className,
  fallbackClassName,
  alt = "",
}: InitialsAvatarProps) {
  const [broken, setBroken] = React.useState(false);
  const showImage = Boolean(src) && !broken;
  const initials = initialsFromName(name);
  const rootStyle = size ? { width: size, height: size } : undefined;
  const autoFontStyle =
    size && !fallbackClassName ? { fontSize: Math.round(size * 0.4) } : undefined;

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        avatarToneFor(name),
        className,
      )}
      style={rootStyle}
    >
      <span
        className={cn("select-none font-semibold leading-none text-ink-strong", fallbackClassName)}
        style={autoFontStyle}
      >
        {initials}
      </span>
      {showImage ? (
        <img
          src={src as string}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setBroken(true)}
          draggable={false}
        />
      ) : null}
    </span>
  );
}
