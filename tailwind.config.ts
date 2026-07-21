import type { Config } from "tailwindcss";

/**
 * Perch — Tailwind config.
 * Colors are the locked design tokens (see docs/ARCHITECTURE.md).
 * WCAG rule: NEVER render body text in baby-blue (sky.*) on white/sky.50.
 * Body text is always ink.strong on white/sky.50, secondary is ink.soft.
 * func.pass/flag/scam stay UNMUTED — never pastel-ify a warning.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Baby-blue surface ramp (overrides Tailwind default sky).
        sky: {
          50: "#F2F9FE",
          100: "#DCEFFB",
          200: "#BFE3F7",
          300: "#9CC5DD",
          400: "#7FB2DB",
          500: "#5E9BCB",
        },
        // Text/ink — the accessible deep-blue text color.
        ink: {
          strong: "#2C4A63",
          soft: "#5E7E97",
          muted: "#8AA2B5",
        },
        // Warm accent — the chick's beak/feet. Sparingly.
        accent: {
          beak: "#F6A22C",
          beakDeep: "#E5851C",
          beakLight: "#E9A24C",
        },
        // Functional colors — UNMUTED, do not pastel-ify.
        func: {
          pass: "#16A34A",
          flag: "#D97706",
          scam: "#DC2626",
          passBg: "#DCFCE7",
          flagBg: "#FEF3C7",
          scamBg: "#FEE2E2",
        },
        // Semantic aliases for the mascot (same hex as sky.200/sky.400).
        chick: {
          body: "#BFE3F7",
          wing: "#7FB2DB",
        },
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        // A calm display → body ramp anchored on ink.strong.
        display: ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.01em", fontWeight: "700" }],
        h1: ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.01em", fontWeight: "700" }],
        h2: ["1.375rem", { lineHeight: "1.75rem", fontWeight: "600" }],
        h3: ["1.125rem", { lineHeight: "1.5rem", fontWeight: "600" }],
        body: ["0.9375rem", { lineHeight: "1.4rem", fontWeight: "400" }],
        caption: ["0.8125rem", { lineHeight: "1.15rem", fontWeight: "400" }],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(44, 74, 99, 0.06), 0 4px 12px rgba(44, 74, 99, 0.06)",
        pop: "0 8px 24px rgba(44, 74, 99, 0.14)",
      },
      keyframes: {
        // Skeleton shimmer.
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
