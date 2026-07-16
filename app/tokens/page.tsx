/**
 * /tokens - a dev-only swatch page. Renders every FROZEN §3 design token so
 * both people can eyeball the palette (contract §6 acceptance).
 */

type Swatch = {
  name: string;
  hex: string;
  className: string;
  role: string;
};

const swatches: Swatch[] = [
  { name: "sky.50", hex: "#F2F9FE", className: "bg-sky-50", role: "app page bg" },
  { name: "sky.100", hex: "#DCEFFB", className: "bg-sky-100", role: "surfaces / chips / sheets" },
  { name: "sky.200 · chick.body", hex: "#BFE3F7", className: "bg-sky-200", role: "primary fill / mascot body" },
  { name: "sky.300", hex: "#9CC5DD", className: "bg-sky-300", role: "borders / dividers on white" },
  { name: "sky.400 · chick.wing", hex: "#7FB2DB", className: "bg-sky-400", role: "buttons / mascot wing" },
  { name: "sky.500", hex: "#5E9BCB", className: "bg-sky-500", role: "pressed / hover" },
  { name: "white", hex: "#FFFFFF", className: "bg-white border border-sky-300", role: "base surface" },
  { name: "ink.strong", hex: "#2C4A63", className: "bg-ink-strong", role: "body text + headings" },
  { name: "ink.soft", hex: "#5E7E97", className: "bg-ink-soft", role: "secondary / caption text" },
  { name: "ink.muted", hex: "#8AA2B5", className: "bg-ink-muted", role: "disabled / placeholder" },
  { name: "accent.beak", hex: "#F6A22C", className: "bg-accent-beak", role: "top pick / highlights (sparingly)" },
  { name: "accent.beakDeep", hex: "#E5851C", className: "bg-accent-beakDeep", role: "accent pressed" },
  { name: "accent.beakLight", hex: "#E9A24C", className: "bg-accent-beakLight", role: "soft warm tint" },
  { name: "func.pass", hex: "#16A34A", className: "bg-func-pass", role: "UNMUTED - passes / safe / verified" },
  { name: "func.flag", hex: "#D97706", className: "bg-func-flag", role: "UNMUTED - caution / lease-fit warning" },
  { name: "func.scam", hex: "#DC2626", className: "bg-func-scam", role: "UNMUTED - scam / hard fail" },
  { name: "func.passBg", hex: "#DCFCE7", className: "bg-func-passBg", role: "pale green verdict pill bg" },
  { name: "func.flagBg", hex: "#FEF3C7", className: "bg-func-flagBg", role: "pale amber verdict pill bg" },
  { name: "func.scamBg", hex: "#FEE2E2", className: "bg-func-scamBg", role: "pale red verdict pill bg" },
];

export default function TokensPage() {
  return (
    <main className="min-h-dvh bg-sky-50 px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-h1 text-ink-strong">Design tokens</h1>
          <p className="mt-2 text-body text-ink-soft">
            The frozen palette from <code>docs/FOUNDATION-CONTRACT.md</code> §3.
            Body text is <em className="not-italic text-ink-strong font-semibold">always</em> ink.strong on
            white/sky.50 - <em className="not-italic">never</em> baby-blue on white (WCAG).
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {swatches.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-4 rounded-2xl bg-white p-3 shadow-card"
            >
              <div
                className={`${s.className} h-16 w-16 rounded-xl border border-sky-300 shrink-0`}
                aria-label={s.name}
              />
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-ink-strong">{s.name}</span>
                  <code className="text-caption text-ink-soft">{s.hex}</code>
                </div>
                <p className="text-caption text-ink-soft">{s.role}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="text-h2 text-ink-strong mb-3">Text on surfaces</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-body text-ink-strong">Body text on white - <strong>ink.strong</strong>. This is the reading surface.</p>
              <p className="text-caption text-ink-soft mt-1">Caption text - ink.soft.</p>
            </div>
            <div className="rounded-2xl bg-sky-100 p-4">
              <p className="text-body text-ink-strong">Body text on sky.100 - still <strong>ink.strong</strong>.</p>
              <p className="text-caption text-ink-soft mt-1">Caption text - ink.soft.</p>
            </div>
            <div className="rounded-2xl bg-sky-200 p-4">
              <p className="text-body text-ink-strong">Body text on sky.200 - still ink.strong. Sky-blue is for surfaces, not text.</p>
            </div>
            <div className="rounded-2xl bg-ink-strong p-4">
              <p className="text-body text-white">On ink.strong, text goes white.</p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-h2 text-ink-strong mb-3">Verdict pills - unmuted</h2>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-func-passBg text-func-pass font-semibold text-caption px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-func-pass" /> Passes budget
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-func-flagBg text-func-flag font-semibold text-caption px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-func-flag" /> Lease ends early
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-func-scamBg text-func-scam font-semibold text-caption px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-func-scam" /> Scam signals
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
