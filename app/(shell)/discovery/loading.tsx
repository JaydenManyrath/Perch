import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DiscoveryLoading() {
  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header className="mb-4">
        <h1 className="text-h1 text-ink-strong">Discovery</h1>
        <p className="text-caption text-ink-soft">Finding your flock...</p>
      </header>
      <ul className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="mt-2 h-3 w-3/4" />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-32 rounded-full" />
                  <Skeleton className="h-5 w-40 rounded-full" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-11 w-40 rounded-2xl" />
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
