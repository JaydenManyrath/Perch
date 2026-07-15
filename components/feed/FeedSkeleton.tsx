import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

/** Loading skeleton matching the shape of an EventCard. */
export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 flex-1" />
              </div>
              <Skeleton className="mt-3 h-4 w-11/12" />
              <Skeleton className="mt-1.5 h-4 w-4/5" />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
