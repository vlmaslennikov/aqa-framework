import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { PageLoadError } from "@/components/page-load-error";
import { useIntersectionObserver } from "@/lib/use-intersection-observer";
import { NoReceivedSharesState } from "@/features/sharing/components/no-received-shares-state";
import { ReceivedShareRow } from "@/features/sharing/components/received-share-row";
import { ReceivedSharesRowsSkeleton, ReceivedSharesSkeleton } from "@/features/sharing/components/received-shares-skeleton";
import { useReceivedShares } from "@/features/sharing/hooks";

export function SharedWithMePage() {
  const sharesQuery = useReceivedShares();
  const { isPending, isError, data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = sharesQuery;

  const sentinelRef = useIntersectionObserver<HTMLDivElement>(
    () => {
      if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) fetchNextPage();
    },
    hasNextPage,
    data?.pages.length
  );

  const shares = data ? data.pages.flatMap((page) => page.items) : [];
  const isEmpty = data !== undefined && shares.length === 0 && !hasNextPage;

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />

      <main className="flex flex-1 flex-col gap-4 p-6">
        <h1 className="text-lg font-semibold">Shared with me</h1>

        {isPending && <ReceivedSharesSkeleton />}

        {isError && !data && (
          <PageLoadError message="Could not load what's been shared with you." onRetry={() => sharesQuery.refetch()} />
        )}

        {isEmpty && <NoReceivedSharesState />}

        {data && !isEmpty && (
          <div className="flex flex-col gap-2">
            {shares.map((share) => (
              <ReceivedShareRow key={share.shareId} share={share} />
            ))}

            {isFetchingNextPage && <ReceivedSharesRowsSkeleton />}

            {hasNextPage && <div ref={sentinelRef} className="h-1" />}

            <div className="flex flex-col items-center gap-2 py-2">
              {isFetchNextPageError && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Could not load more items.</span>
                  <Button variant="outline" size="sm" onClick={() => fetchNextPage()}>
                    Retry
                  </Button>
                </div>
              )}

              {hasNextPage && !isFetchNextPageError && (
                <Button variant="outline" size="sm" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
                  {isFetchingNextPage ? "Loading..." : "Load more"}
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
