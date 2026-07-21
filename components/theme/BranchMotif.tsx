import { cn } from "@/lib/utils";

/**
 * BranchMotif (RD52) - a quiet hand-drawn branch the UI can "perch" things on.
 *
 * DESIGN RULES (docs/ARCHITECTURE.mdthe mascot-filter lesson):
 *   - Flat vector ONLY. No SVG filters (no feTurbulence / feDisplacementMap /
 *     feGaussianBlur) - those stutter and render inconsistently. Cheap to paint.
 *   - Token colors only (the Tailwind stroke and fill utilities map to the
 *     frozen section 3 tokens): baby-blue line work (sky.300) + leaves (sky.200),
 *     warm accent buds (accent.beakLight) used sparingly. No raw hex.
 *   - Purely decorative: aria-hidden, never focusable, never intercepts pointer
 *     events. It is static (no animation), so prefers-reduced-motion is a no-op.
 *
 * PLACEMENT RULE (section 9): emotional surfaces ONLY - the shell SideRail edge,
 * onboarding backdrop, empty states (a perch for the chick), and login/landing.
 * It is deliberately ABSENT from decision surfaces: listing cards + detail
 * sheets, booking/finance, safety content, and the map canvas. The theme adds
 * delight; it never costs clarity, so this sits behind content at low contrast.
 *
 *   - "rail":   slender branch climbing the desktop SideRail edge.
 *   - "corner": a branch sweeping from a corner (onboarding, login, landing).
 *   - "perch":  a short twig the mascot sits on (empty states).
 */
export type BranchMotifVariant = "rail" | "corner" | "perch";

const VIEWBOX: Record<BranchMotifVariant, string> = {
  rail: "0 0 64 520",
  corner: "0 0 220 220",
  perch: "0 0 200 80",
};

const PRESERVE: Record<BranchMotifVariant, string> = {
  // Anchor the rail to the bottom-right so the stem always shows against the edge.
  rail: "xMaxYMax slice",
  corner: "xMinYMax meet",
  perch: "xMidYMid meet",
};

export function BranchMotif({
  variant = "corner",
  className,
}: {
  variant?: BranchMotifVariant;
  className?: string;
}) {
  return (
    <svg
      viewBox={VIEWBOX[variant]}
      preserveAspectRatio={PRESERVE[variant]}
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none select-none", className)}
    >
      {variant === "rail" ? <RailBranch /> : null}
      {variant === "corner" ? <CornerBranch /> : null}
      {variant === "perch" ? <PerchBranch /> : null}
    </svg>
  );
}

/** A single soft leaf, drawn from the origin pointing up-right; place with translate+rotate. */
function Leaf({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <path
        d="M0 0 C 7 -11 19 -13 27 -6 C 19 1 7 3 0 0 Z"
        className="fill-sky-200 stroke-sky-300"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d="M3 -1 C 10 -4 17 -5 23 -5"
        className="stroke-sky-300"
        strokeWidth={1.1}
        fill="none"
        strokeLinecap="round"
        opacity={0.7}
      />
    </g>
  );
}

/** A small warm bud - the one warm accent, used sparingly. */
function Bud({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r={4.5} className="fill-accent-beakLight" />;
}

function RailBranch() {
  return (
    <g
      className="stroke-sky-300"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Main stem climbing the right edge. */}
      <path
        d="M50 518 C 41 470 54 432 46 390 C 39 352 41 302 48 264 C 55 228 43 192 46 152 C 49 120 44 80 50 46 C 53 30 50 18 48 8"
        strokeWidth={5}
      />
      {/* Offshoots reaching left into the rail. */}
      <path d="M47 396 C 34 388 25 386 15 390" strokeWidth={3} />
      <path d="M47 268 C 33 262 23 266 13 274" strokeWidth={3} />
      <path d="M48 152 C 35 146 26 148 16 152" strokeWidth={3} />
      <Leaf transform="translate(15 390) rotate(196)" />
      <Leaf transform="translate(13 274) rotate(205)" />
      <Leaf transform="translate(16 152) rotate(196)" />
      <Bud cx={49} cy={64} />
      <Bud cx={45} cy={410} />
    </g>
  );
}

function CornerBranch() {
  return (
    <g
      className="stroke-sky-300"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Branch sweeping from the bottom-left corner up toward the top-right. */}
      <path
        d="M4 216 C 34 168 52 138 92 116 C 132 94 158 74 188 30"
        strokeWidth={5}
      />
      {/* Offshoots + leaves along the sweep. */}
      <path d="M60 140 C 52 124 52 112 58 100" strokeWidth={3} />
      <path d="M104 108 C 100 92 102 80 110 70" strokeWidth={3} />
      <path d="M150 78 C 148 62 152 52 160 44" strokeWidth={3} />
      <Leaf transform="translate(58 100) rotate(-72)" />
      <Leaf transform="translate(110 70) rotate(-64)" />
      <Leaf transform="translate(160 44) rotate(-58)" />
      <Leaf transform="translate(30 176) rotate(-108)" />
      <Bud cx={186} cy={30} />
      <Bud cx={83} cy={121} />
    </g>
  );
}

function PerchBranch() {
  return (
    <g
      className="stroke-sky-300"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* A gently arced twig for the chick to sit on. */}
      <path d="M6 44 C 54 36 146 36 194 44" strokeWidth={5} />
      {/* Two small leaf clusters off the ends, peeking past the mascot. */}
      <path d="M32 42 C 24 32 20 24 22 14" strokeWidth={3} />
      <path d="M170 42 C 178 34 182 28 181 20" strokeWidth={3} />
      <Leaf transform="translate(22 14) rotate(-96)" />
      <Leaf transform="translate(181 20) rotate(-46)" />
      <Bud cx={26} cy={26} />
    </g>
  );
}
