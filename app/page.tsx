import Link from "next/link";
import { Mascot } from "@/components/mascot/Mascot";

/**
 * Root splash. Not part of the shell. Offers a way into onboarding or the shell.
 * In production this would route based on session state.
 */
export default function RootPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-sky-50">
      <div className="max-w-md w-full flex flex-col items-center text-center gap-6">
        <Mascot variant="idle" size={168} />
        <div>
          <h1 className="text-display text-ink-strong">Perch</h1>
          <p className="mt-2 text-body text-ink-soft">
            Land in a new city. Find your flock, perch on a sublease, get familiar before you arrive.
          </p>
        </div>
        <div className="flex flex-col w-full gap-3">
          <Link
            href="/onboarding"
            className="rounded-2xl bg-sky-400 hover:bg-sky-500 text-white font-semibold py-3 text-center shadow-card transition-colors"
          >
            Start onboarding
          </Link>
          <Link
            href="/feed"
            className="rounded-2xl bg-white border border-sky-300 text-ink-strong font-semibold py-3 text-center shadow-card hover:bg-sky-100 transition-colors"
          >
            Skip to the app shell
          </Link>
          <Link
            href="/tokens"
            className="text-caption text-ink-soft hover:text-ink-strong underline underline-offset-2"
          >
            (dev) design tokens
          </Link>
        </div>
      </div>
    </main>
  );
}
