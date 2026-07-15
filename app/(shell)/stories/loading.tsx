import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function StoriesLoading() {
  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header>
        <h1 className="text-h1 text-ink-strong">Perches</h1>
        <p className="text-caption text-ink-soft">
          Sublets that fit a ~10-week internship.
        </p>
      </header>
      <div className="mt-4 flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i}>
            <Card>
              <Skeleton className="aspect-video w-full rounded-t-2xl" />
              <div className="p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
