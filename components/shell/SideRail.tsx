"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isActive } from "./nav-items";
import { BrandMark } from "./BrandMark";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth/session";
import { SignOutButton } from "@/components/auth/SignOutButton";

/**
 * SideRail - desktop left-side navigation (>= md). Fixed to the left edge.
 */
export function SideRail() {
  const pathname = usePathname();
  const { currentUser } = useCurrentUser();
  const items = navItems(currentUser?.id);
  return (
    <aside
      aria-label="Primary"
      className="hidden md:flex flex-col fixed inset-y-0 left-0 z-30 w-64 border-r border-sky-200 bg-white/80 backdrop-blur px-4 py-5"
    >
      <BrandMark className="mb-6 pl-2" />
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-body font-semibold transition-colors",
                  active
                    ? "bg-sky-100 text-ink-strong"
                    : "text-ink-strong hover:bg-sky-50"
                )}
              >
                <Icon
                  className={cn("h-5 w-5", active ? "text-sky-500" : "text-ink-soft")}
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden
                />
                <span>{item.label}</span>
                <span className="ml-auto text-caption font-normal text-ink-muted">
                  {item.subtitle}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex flex-col gap-3 text-caption text-ink-muted pl-3">
        <p>Land in a new city.</p>
        <SignOutButton />
      </div>
    </aside>
  );
}
