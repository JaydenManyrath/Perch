import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LandingLoading() {
  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header className="mb-4">
        <h1 className="text-h1 text-ink-strong">Landing</h1>
        <p className="text-caption text-ink-soft">Your first week - a plausible plan.</p>
      </header>
      <ol className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i}>
            <Card>
              <div className="p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-2 h-3 w-24" />
                <div className="mt-4 flex flex-col gap-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-11/12" />
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
