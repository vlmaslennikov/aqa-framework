import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

export function ContentsTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

interface ContentsRowsSkeletonProps {
  rows?: number;
}

export function ContentsRowsSkeleton({ rows = 3 }: ContentsRowsSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow key={index} className="hover:bg-transparent">
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell />
        </TableRow>
      ))}
    </>
  );
}
