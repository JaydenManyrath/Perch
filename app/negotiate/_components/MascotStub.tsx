"use client";

/**
 * STUB for Person A's `Mascot` component (A2). Appears ONLY in the loading/working
 * area of the hero - a personality moment - never over the numbers (CLAUDE.md §9).
 * Swap for the real <Mascot variant="hop" /> at integration checkpoint C2. Baby-blue
 * body + orange beak per the §3 recolor; a gentle CSS hop gated behind reduced-motion.
 */
export function MascotStub() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div className="perch-hop" aria-hidden style={{ width: 56, height: 56 }}>
        <svg viewBox="0 0 64 64" width="56" height="56" role="img" aria-label="Perch chick">
          <ellipse cx="32" cy="58" rx="16" ry="4" fill="#9CC5DD" opacity="0.5" />
          <circle cx="32" cy="34" r="20" fill="#BFE3F7" />
          <circle cx="32" cy="20" r="12" fill="#BFE3F7" />
          <path d="M26 34 q6 6 12 0" fill="#7FB2DB" opacity="0.6" />
          <circle cx="27" cy="19" r="2.4" fill="#2C4A63" />
          <circle cx="37" cy="19" r="2.4" fill="#2C4A63" />
          <path d="M30 23 l4 0 l-2 3 z" fill="#F6A22C" />
          <path d="M28 55 l-3 4 M36 55 l3 4" stroke="#F6A22C" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
      <span style={{ fontSize: 13, color: "#5E7E97" }}>Scouting your perches...</span>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .perch-hop { animation: perchHop 1s ease-in-out infinite; }
          @keyframes perchHop { 0%,100% { transform: translateY(0) } 40% { transform: translateY(-8px) } }
        }
      `}</style>
    </div>
  );
}
