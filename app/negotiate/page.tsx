import { getSavedPerches, getPerchDeck } from "@/lib/data/server-source";
import { NegotiateClient, type PickablePerch } from "./_components/NegotiateClient";

const INK_STRONG = "#2C4A63";
const INK_SOFT = "#5E7E97";

/**
 * B10 negotiation hero. Rather than pasting raw listing UUIDs, the intern scouts their
 * own saved perches (falling back to the fresh deck when nothing is saved yet). Four
 * deterministic scouts - budget, safety, lease fit, routine fit - stream in a verdict
 * per perch, then rank them best to worst. The LLM only narrates; it never moves a
 * verdict (CLAUDE.md section 4).
 */
export default async function NegotiatePage() {
  const saved = await getSavedPerches();
  // Fall back to the fresh deck so the hero always has something to scout in the demo.
  const source = saved.length > 0 ? saved : (await getPerchDeck()).deck;
  const perches: PickablePerch[] = source.map((p) => ({
    id: p.id,
    title: p.title,
    address: p.address,
    price: p.price,
  }));

  return (
    <main style={{ padding: "2.5rem 1.25rem", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: INK_STRONG }}>Scout your perches</h1>
      <p style={{ color: INK_SOFT, marginTop: 4, lineHeight: 1.5 }}>
        Send scouts to vet each saved sublet against four checks - does it fit your budget,
        is it free of scam flags, does the lease cover your whole internship, and is it
        close to your daily routine? Real numbers, ranked best to worst. The chick handles
        the waiting; the verdicts stay serious.
      </p>

      <NegotiateClient perches={perches} />
    </main>
  );
}
