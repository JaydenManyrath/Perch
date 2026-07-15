import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ProfileLoading() {
  return (
    <div className="px-4 pt-4 md:pt-8 pb-8 flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-3 w-56" />
        </div>
      </header>
      <Card>
        <div className="p-4">
          <Skeleton className="h-5 w-32" />
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-6 w-20 rounded-full" />
            ))}
          </div>
        </div>
      </Card>
      <Card>
        <div className="p-4">
          <Skeleton className="h-5 w-40" />
          <div className="mt-3 flex flex-col gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
