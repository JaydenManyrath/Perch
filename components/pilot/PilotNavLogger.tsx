"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { logScreen, screenForPath } from "@/lib/pilot/navlog";

/** Logs each route change for the opt-in usage pilot (no-op unless enabled at /pilot). */
export function PilotNavLogger() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname && !pathname.startsWith("/pilot")) logScreen(screenForPath(pathname), pathname);
  }, [pathname]);
  return null;
}
