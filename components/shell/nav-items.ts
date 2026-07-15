import type { LucideIcon } from "lucide-react";
import { Newspaper, Camera, Map, MessageCircle, User } from "lucide-react";
import { ME_ID } from "@/lib/fixtures/users";

/**
 * Five IG-shaped destinations. Nav is shared between BottomNav (mobile) and
 * SideRail (desktop) so the source-of-truth is one file.
 *
 * The Profile destination routes to /profile/me — the [id] route treats "me"
 * specially (returns the fixture "me" user).
 */
export type NavItem = {
  href: string;
  label: string;
  bird: string; // bird word (subtitled where needed)
  icon: LucideIcon;
  // Optional additional paths that also mark this item active.
  match?: RegExp;
};

export const navItems: NavItem[] = [
  { href: "/feed", label: "Feed", bird: "Flyway", icon: Newspaper },
  { href: "/stories", label: "Stories", bird: "perches", icon: Camera },
  { href: "/map", label: "Map", bird: "your city", icon: Map },
  { href: "/dms", label: "DMs", bird: "your flock", icon: MessageCircle, match: /^\/dms(\/.*)?$/ },
  { href: `/profile/${ME_ID}`, label: "Profile", bird: "you", icon: User, match: /^\/profile\/.*/ },
];

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match.test(pathname);
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
