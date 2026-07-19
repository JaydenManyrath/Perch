import { BottomNav } from "@/components/shell/BottomNav";
import { SideRail } from "@/components/shell/SideRail";
import { TopBar } from "@/components/shell/TopBar";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { DataSourceBadge } from "@/components/dev/DataSourceBadge";
import { CurrentUserProvider } from "@/lib/auth/session";
import { getInitialSession } from "@/lib/auth/server-session";

/**
 * The IG-shaped shell chrome. On mobile: TopBar + content + BottomNav.
 * On desktop (>=md): SideRail on the left, wide content, no bottom bar.
 * Body has overflow-x: hidden globally - wide content scrolls in its own container.
 */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const session = await getInitialSession();

  return (
    <CurrentUserProvider initialUser={session.currentUser} mode={session.mode}>
      <div className="min-h-dvh bg-sky-50">
        <SideRail />
        <TopBar right={<SignOutButton compact />} />
        <main
          role="main"
          className="md:pl-64 pb-20 md:pb-0"
        >
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>
        <BottomNav />
        <DataSourceBadge />
      </div>
    </CurrentUserProvider>
  );
}
