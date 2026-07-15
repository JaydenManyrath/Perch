"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Perch — the plush-chick mascot. Recolored teal → baby-blue per FOUNDATION-CONTRACT §3
 * (body = sky.200/chick.body, wings = sky.400/chick.wing, beak/feet = accent.beak*).
 *
 * `variant`:
 *   - "idle": breathes + blinks + slow wing-sway. Default resting mascot.
 *   - "hop":  hops + flaps + ground-shadow. Loading / "working" states.
 *
 * All motion loops gate behind @media (prefers-reduced-motion: no-preference)
 * in styles/mascot-keyframes.css. Under reduced motion the same SVG renders as
 * a static pose — no code changes needed.
 *
 * PLACEMENT RULE (CLAUDE.md §9): the chick lives ONLY in personality moments —
 * onboarding, loading, empty states, milestones. It is ABSENT from decision
 * surfaces (listings, safety, money, map decisions).
 *
 * SHARED-EXPORT (contract §7): This component is a stable export B consumes for
 * the negotiation "working" state. Do not change its prop API without a contract PR.
 */
export type MascotVariant = "idle" | "hop";

export interface MascotProps {
  variant?: MascotVariant;
  /** Rendered width in px. Height scales to preserve aspect. */
  size?: number;
  /** Optional caption shown beneath the chick (empty states, loading copy). */
  caption?: string;
  className?: string;
}

export function Mascot({ variant = "idle", size = 168, caption, className }: MascotProps) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, "");
  const softId = `mascot-${uid}-soft`;
  const soft2Id = `mascot-${uid}-soft2`;
  const height = Math.round((size * 336) / 260);

  return (
    <div
      className={cn("inline-flex flex-col items-center gap-2", className)}
      role="img"
      aria-label={caption ?? "Perch — the plush-chick mascot"}
    >
      <svg
        width={size}
        height={height}
        viewBox="0 -30 260 336"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <filter id={softId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id={soft2Id} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* Ground shadow */}
        {variant === "hop" ? (
          <ellipse
            cx={130}
            cy={290}
            rx={70}
            ry={10}
            fill="#2C4A63"
            opacity={0.16}
            className="ap-shadow"
          />
        ) : (
          <ellipse cx={130} cy={290} rx={70} ry={10} fill="#2C4A63" opacity={0.14} />
        )}

        <g className={variant === "hop" ? "ap-hop" : "ap-breathe"}>
          {/* Left wing */}
          <g className={variant === "hop" ? "ap-flap" : "ap-wing-sway"}>
            <ChickWing />
          </g>
          {/* Right wing (mirrored) */}
          <g transform="matrix(-1 0 0 1 260 0)">
            <g className={variant === "hop" ? "ap-flap" : "ap-wing-sway"}>
              <ChickWing />
            </g>
          </g>

          <ChickCore soft2Id={soft2Id} softId={softId} />
          <ChickFeet />

          {/* Eyes (blink) */}
          <g className={variant === "hop" ? "ap-blink ap-blink-mid" : "ap-blink ap-blink-slow"}>
            <ChickEyes />
          </g>

          <ChickBlush />
        </g>
      </svg>
      {caption ? <span className="text-caption text-ink-soft">{caption}</span> : null}
    </div>
  );
}

// ─── SVG parts — colors match contract §3 recolor table (chick.body / chick.wing / accent.beak*) ───

function ChickWing() {
  return (
    <g>
      <path
        d="M88,184 C60,196 30,190 17,166 C11,153 21,145 33,152 C43,158 58,168 74,172 C82,174 88,178 90,182 Z"
        fill="#7FB2DB"
      />
      <path
        d="M30,162 C41,159 53,163 63,167"
        stroke="#5E7E97"
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        opacity={0.8}
      />
      <path
        d="M26,169 C37,167 49,170 59,173"
        stroke="#5E7E97"
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        opacity={0.7}
      />
      <path
        d="M18,161 C24,159 30,160 35,163"
        stroke="#F7FBFC"
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

function ChickCore({ soft2Id, softId }: { soft2Id: string; softId: string }) {
  return (
    <g>
      <ellipse cx={130} cy={176} rx={98} ry={98} fill="#DCEFFB" opacity={0.6} filter={`url(#${soft2Id})`} />
      <circle cx={130} cy={176} r={95} fill="#BFE3F7" />
      <ellipse cx={130} cy={240} rx={72} ry={34} fill="#5E7E97" opacity={0.16} filter={`url(#${soft2Id})`} />
      <path d="M126,61 C121,48 119,38 122,31 C126,34 128,46 129,60 Z" fill="#7FB2DB" />
      <path d="M135,61 C139,49 143,40 142,32 C137,35 133,47 132,60 Z" fill="#7FB2DB" />
      <path d="M130,62 C127,46 128,33 131,26 C135,33 134,49 133,61 Z" fill="#8FC7E8" />
      <path
        d="M37,150 C37,96 80,60 130,60 C180,60 223,96 223,150 C223,182 206,193 182,196 C170,197 162,205 148,205 C140,205 137,200 130,200 C123,200 120,205 112,205 C98,205 92,197 78,196 C54,193 37,182 37,150 Z"
        fill="#F7FBFC"
      />
      <path
        d="M62,197 C92,207 168,207 198,197"
        stroke="#9CC5DD"
        strokeWidth={9}
        opacity={0.15}
        fill="none"
        strokeLinecap="round"
        filter={`url(#${softId})`}
      />
      <ellipse
        cx={92}
        cy={106}
        rx={30}
        ry={19}
        fill="#ffffff"
        opacity={0.45}
        filter={`url(#${soft2Id})`}
        transform="rotate(-24 92 106)"
      />
      <path
        d="M121,150 C125,148 135,148 139,150 C141,151 141,154 139,156 L132,164 C130.5,166 129.5,166 128,164 L121,156 C119,154 119,151 121,150 Z"
        fill="#F6A22C"
      />
      <path
        d="M125,158 C129,160 133,160 137,158 L132,164 C130.5,166 129.5,166 128,164 Z"
        fill="#E5851C"
      />
    </g>
  );
}

function ChickFeet() {
  return (
    <g fill="#E9A24C">
      <g transform="translate(116,256)">
        <ellipse cx={-5} cy={7} rx={2.8} ry={7} transform="rotate(-22 -5 7)" />
        <ellipse cx={0} cy={8} rx={3} ry={7.6} />
        <ellipse cx={5} cy={7} rx={2.8} ry={7} transform="rotate(22 5 7)" />
      </g>
      <g transform="translate(146,256)">
        <ellipse cx={-5} cy={7} rx={2.8} ry={7} transform="rotate(-22 -5 7)" />
        <ellipse cx={0} cy={8} rx={3} ry={7.6} />
        <ellipse cx={5} cy={7} rx={2.8} ry={7} transform="rotate(22 5 7)" />
      </g>
    </g>
  );
}

function ChickEyes() {
  return (
    <g>
      <circle cx={108} cy={147} r={6.8} fill="#2C4A63" />
      <circle cx={152} cy={147} r={6.8} fill="#2C4A63" />
      <circle cx={105.6} cy={144.4} r={1.9} fill="#fff" opacity={0.9} />
      <circle cx={149.6} cy={144.4} r={1.9} fill="#fff" opacity={0.9} />
    </g>
  );
}

function ChickBlush() {
  return (
    <g>
      <ellipse cx={93} cy={161} rx={12} ry={7.5} fill="#F2A69E" opacity={0.5} />
      <ellipse cx={167} cy={161} rx={12} ry={7.5} fill="#F2A69E" opacity={0.5} />
    </g>
  );
}
