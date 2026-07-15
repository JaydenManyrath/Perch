import { Mascot } from "@/components/mascot/Mascot";

/**
 * Dev-only page to eyeball the mascot in its two variants.
 * Toggle OS reduced-motion → both variants should freeze to their static pose.
 */
export default function MascotDemoPage() {
  return (
    <main className="min-h-dvh bg-sky-50 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-h1 text-ink-strong">Mascot</h1>
        <p className="mt-1 text-body text-ink-soft">
          Personality moments only. Absent from decision surfaces.
        </p>

        <section className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-white p-6 shadow-card flex flex-col items-center">
            <Mascot variant="idle" size={168} caption='variant="idle" — breathe + blink + slow wing-sway' />
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-card flex flex-col items-center">
            <Mascot variant="hop" size={168} caption='variant="hop" — hop + flap + ground shadow' />
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-card flex flex-col items-center">
            <Mascot variant="idle" size={96} caption="small (96px)" />
            <div className="h-4" />
            <Mascot variant="hop" size={64} caption="tiny (64px)" />
          </div>
        </section>

        <section className="mt-10 rounded-2xl bg-sky-100 p-6">
          <h2 className="text-h2 text-ink-strong">Reduced motion</h2>
          <p className="mt-2 text-body text-ink-strong">
            Toggle <em>Reduce motion</em> in your OS (or in devtools → Rendering →
            Emulate CSS media feature <code>prefers-reduced-motion: reduce</code>) — both
            variants should freeze to a still pose.
          </p>
        </section>
      </div>
    </main>
  );
}
