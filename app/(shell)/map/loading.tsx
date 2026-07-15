import { Skeleton } from "@/components/ui/Skeleton";

export default function MapLoading() {
  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header className="mb-3">
        <h1 className="text-h1 text-ink-strong">Map</h1>
        <p className="text-caption text-ink-soft">Loading your places and stickers…</p>
      </header>
      <Skeleton className="h-[62dvh] md:h-[70dvh] w-full rounded-2xl" />
    </div>
  );
}
