import { BottomNav } from "@/components/shell/BottomNav";
import { SideRail } from "@/components/shell/SideRail";
import { TopBar } from "@/components/shell/TopBar";

/**
 * The IG-shaped shell chrome. On mobile: TopBar + content + BottomNav.
 * On desktop (>=md): SideRail on the left, wide content, no bottom bar.
 * Body has overflow-x: hidden globally - wide content scrolls in its own container.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-sky-50">
      <SideRail />
      <TopBar />
      <main
        role="main"
        className="md:pl-64 pb-20 md:pb-0"
      >
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
