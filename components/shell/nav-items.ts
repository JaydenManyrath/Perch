import type { LucideIcon } from "lucide-react";
import { Newspaper, Home, Map, MessageCircle, User } from "lucide-react";

/**
 * Five destinations. Nav is shared between BottomNav (mobile) and SideRail
 * (desktop) so the source-of-truth is one file.
 *
 * NAMING (round 5, RD51 - naming contract docs/ARCHITECTURE.md):
 * every tab wears its bird word as the `label`, with the plain meaning kept
 * as the `subtitle` so the theme never costs clarity (section 9). Bird labels:
 * Flyway (the feed), Perches (swipe sublets), Migration (your city),
 * Chirps (DMs), Nest (you).
 *
 * ROUTES ARE FROZEN: /feed, /stories, /map, /dms, /profile/* keep their paths
 * so deep links never break - only the labels changed. (/stories is the
 * Tinder-style perches swipe deck kept at its round-2 path.)
 * The Nest destination routes to /profile/me - the [id] route treats "me"
 * specially (returns the fixture "me" user).
 */
export type NavItem = {
  href: string;
  label: string; // the tab label (bird word)
  subtitle: string; // plain-meaning subtitle (clarity per section 9)
  icon: LucideIcon;
  // Optional additional paths that also mark this item active.
  match?: RegExp;
};

export function navItems(currentUserId?: string): NavItem[] {
  return [
    { href: "/feed", label: "Flyway", subtitle: "the feed", icon: Newspaper },
    { href: "/stories", label: "Perches", subtitle: "swipe sublets", icon: Home },
    { href: "/map", label: "Migration", subtitle: "your city", icon: Map },
    { href: "/dms", label: "Chirps", subtitle: "DMs", icon: MessageCircle, match: /^\/dms(\/.*)?$/ },
    {
      href: `/profile/${currentUserId ?? "me"}`,
      label: "Nest",
      subtitle: "you",
      icon: User,
      match: /^\/profile\/.*/,
    },
  ];
}

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match.test(pathname);
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
