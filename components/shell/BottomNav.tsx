"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isActive } from "./nav-items";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth/session";

/**
 * BottomNav - mobile bottom tab bar (hidden on md+). Five destinations.
 * Fixed at the viewport bottom with a safe-area-inset padding.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { currentUser } = useCurrentUser();
  const items = navItems(currentUser?.id);
  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t border-sky-200"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {items.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-caption font-semibold transition-colors",
                  active ? "text-ink-strong" : "text-ink-soft hover:text-ink-strong"
                )}
              >
                <Icon
                  className={cn("h-6 w-6", active && "text-sky-500")}
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
