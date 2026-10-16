import { Skeleton } from "@/components/ui/skeleton";

export function ShareDialogSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex flex-col gap-2 border-t pt-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}
