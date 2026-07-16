import { BrandMark } from "./BrandMark";

/**
 * TopBar - mobile-only header shown at the top of every shell page.
 * Simple: brand mark on the left, room for a right-side action later.
 */
export function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="md:hidden sticky top-0 z-20 flex items-center justify-between bg-white/95 backdrop-blur border-b border-sky-200 px-4 py-2">
      <BrandMark size={28} />
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </header>
  );
}
