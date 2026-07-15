import Link from "next/link";

/**
 * Placeholder home. The real app shell (feed/stories/map/DMs/profile) is Person A
 * (A3). Person B ships one UI surface end-to-end: the negotiation hero at
 * /negotiate (B10). This page just links there for demo/dev convenience.
 */
export default function Home() {
  return (
    <main style={{ padding: "3rem", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Perch 🐣</h1>
      <p style={{ color: "#5e7e97", marginTop: "0.5rem" }}>
        Person B backend + intelligence layer. The app shell is Person A&apos;s.
      </p>
      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/negotiate" style={{ color: "#5e9bcb", fontWeight: 600 }}>
          → Negotiation hero (B10)
        </Link>
      </p>
    </main>
  );
}
