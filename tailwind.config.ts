import type { Config } from "tailwindcss";

/**
 * LOCAL TOKEN STUB (Person B).
 *
 * Person A authors the canonical `tailwind.config.ts` (FOUNDATION-CONTRACT §3, item 4
 * of the Day-1 sprint). Until A's version merges to `main`, this stub encodes the
 * exact frozen token NAMES + HEX from the contract so B's negotiation hero screen
 * (B10) is never blocked. Swap this for A's authored config at integration
 * checkpoint C2 — the token names are the frozen seam and must not drift.
 */
const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sky: {
          50: "#F2F9FE",
          100: "#DCEFFB",
          200: "#BFE3F7",
          300: "#9CC5DD",
          400: "#7FB2DB",
          500: "#5E9BCB",
        },
        ink: {
          strong: "#2C4A63",
          soft: "#5E7E97",
          muted: "#8AA2B5",
        },
        accent: {
          beak: "#F6A22C",
          beakDeep: "#E5851C",
          beakLight: "#E9A24C",
        },
        func: {
          pass: "#16A34A",
          flag: "#D97706",
          scam: "#DC2626",
          passBg: "#DCFCE7",
          flagBg: "#FEF3C7",
          scamBg: "#FEE2E2",
        },
        // chick.* aliases (per §3 recolor mapping) for the Mascot slot in the hero.
        chick: {
          body: "#BFE3F7",
          wing: "#7FB2DB",
        },
      },
    },
  },
  plugins: [],
};

export default config;
