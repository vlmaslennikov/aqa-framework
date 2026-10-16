import { Skeleton } from "@/components/ui/skeleton";

export function ReceivedSharesSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

interface ReceivedSharesRowsSkeletonProps {
  rows?: number;
}

export function ReceivedSharesRowsSkeleton({ rows = 2 }: ReceivedSharesRowsSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </>
  );
}
