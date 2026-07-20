import { BottomNav } from "@/components/shell/BottomNav";
import { SideRail } from "@/components/shell/SideRail";
import { BranchMotif } from "@/components/theme/BranchMotif";
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
        {/* Branch motif as a faint backdrop BEHIND page content (not on the rail).
            The layer is fixed over the content area; main stacks above it (z-10),
            so opaque cards cover it and it only peeks through the gaps. */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 md:left-64"
        >
          <BranchMotif
            variant="corner"
            className="absolute bottom-0 left-0 h-56 w-56 opacity-40 md:h-72 md:w-72"
          />
          <BranchMotif
            variant="corner"
            className="absolute right-0 top-16 h-44 w-44 rotate-180 opacity-30 md:h-60 md:w-60"
          />
        </div>
        <main
          role="main"
          className="relative z-10 md:pl-64 pb-20 md:pb-0"
        >
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>
        <BottomNav />
        <DataSourceBadge />
      </div>
    </CurrentUserProvider>
  );
}
