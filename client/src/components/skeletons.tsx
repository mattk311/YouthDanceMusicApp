import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SongRowSkeleton() {
  return (
    <Card>
      <CardContent className="py-3 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Skeleton className="h-6 w-6 rounded sm:h-7 sm:w-8" />
          <Skeleton className="h-12 w-12 rounded-md sm:h-14 sm:w-14 flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full hidden sm:block" />
          <Skeleton className="h-9 w-9 rounded-md flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SongRowSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3" data-testid="skeleton-songs">
      {Array.from({ length: count }).map((_, i) => (
        <SongRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function DanceCardSkeleton() {
  return (
    <Card>
      <CardContent className="py-5 space-y-4">
        <Skeleton className="h-5 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DanceCardSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-3 sm:gap-4 sm:grid-cols-2"
      data-testid="skeleton-dances"
    >
      {Array.from({ length: count }).map((_, i) => (
        <DanceCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RequestRowSkeleton() {
  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-md flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 flex-1 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export function RequestRowSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" data-testid="skeleton-requests">
      {Array.from({ length: count }).map((_, i) => (
        <RequestRowSkeleton key={i} />
      ))}
    </div>
  );
}
