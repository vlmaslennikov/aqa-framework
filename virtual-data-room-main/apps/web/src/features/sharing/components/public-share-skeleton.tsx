import { Skeleton } from "@/components/ui/skeleton";

export function PublicShareSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <Skeleton className="h-6 w-56" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
