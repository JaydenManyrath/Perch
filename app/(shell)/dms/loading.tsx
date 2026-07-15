import { Skeleton } from "@/components/ui/Skeleton";

export default function DMsLoading() {
  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header>
        <h1 className="text-h1 text-ink-strong">DMs</h1>
        <p className="text-caption text-ink-soft">Live messages with your flock.</p>
      </header>
      <ul className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-2xl bg-white border border-sky-100 p-3"
          >
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-2 h-3 w-3/4" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
