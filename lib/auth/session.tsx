"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { UserType } from "@/lib/types/contract";

export type CurrentUser = {
  id: string;
  userType: UserType | null;
};

type SessionMode = "fixture" | "live";

type CurrentUserContextValue = {
  currentUser: CurrentUser | null;
  mode: SessionMode;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

function asUserType(value: unknown): UserType | null {
  return value === "intern" || value === "subletter" ? value : null;
}

export function CurrentUserProvider({
  children,
  initialUser,
  mode,
}: {
  children: ReactNode;
  initialUser: CurrentUser | null;
  mode: SessionMode;
}) {
  const [currentUser, setCurrentUser] = useState(initialUser);

  useEffect(() => {
    if (mode !== "live") return;

    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const client = supabase;

    let active = true;

    async function syncUser(userId: string | null) {
      if (!active) return;
      if (!userId) {
        setCurrentUser(null);
        return;
      }

      const { data } = await client
        .from("users")
        .select("user_type")
        .eq("id", userId)
        .maybeSingle();

      if (active) {
        setCurrentUser({ id: userId, userType: asUserType(data?.user_type) });
      }
    }

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user.id ?? null);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [mode]);

  const value = useMemo(() => ({ currentUser, mode }), [currentUser, mode]);
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUserContextValue {
  const value = useContext(CurrentUserContext);
  if (!value) throw new Error("useCurrentUser must be used inside CurrentUserProvider");
  return value;
}
