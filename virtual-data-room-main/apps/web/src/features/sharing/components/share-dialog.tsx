import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ResourceType } from "@/features/sharing/api";
import { usePublicLinkShare, useShares } from "@/features/sharing/hooks";
import { PeopleAccessSection } from "@/features/sharing/components/people-access-section";
import { PublicLinkSection } from "@/features/sharing/components/public-link-section";
import { ShareDialogSkeleton } from "@/features/sharing/components/share-dialog-skeleton";

interface ShareDialogProps {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ resourceType, resourceId, resourceName, open, onOpenChange }: ShareDialogProps) {
  const sharesQuery = useShares(resourceType, resourceId, open);
  const publicLinkQuery = usePublicLinkShare(resourceType, resourceId, open);
  const hasData = sharesQuery.data !== undefined && publicLinkQuery.data !== undefined;
  const hasError = (sharesQuery.isError || publicLinkQuery.isError) && !hasData;
  const isRetrying = sharesQuery.isFetching || publicLinkQuery.isFetching;
  const peopleShares = sharesQuery.data ? sharesQuery.data.pages.flatMap((page) => page.items) : [];
  const shares = publicLinkQuery.data ? [...publicLinkQuery.data.items, ...peopleShares] : peopleShares;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{resourceName}"</DialogTitle>
        </DialogHeader>

        {!hasData && !hasError && <ShareDialogSkeleton />}

        {hasError && (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <p className="text-sm text-muted-foreground">Could not load sharing settings.</p>
            <Button
              variant="outline"
              size="sm"
              disabled={isRetrying}
              onClick={() => {
                sharesQuery.refetch();
                publicLinkQuery.refetch();
              }}
            >
              {isRetrying ? "Retrying..." : "Retry"}
            </Button>
          </div>
        )}

        {hasData && (
          <div className="flex flex-col gap-5">
            <PublicLinkSection resourceType={resourceType} resourceId={resourceId} shares={shares} />
            <div className="border-t pt-4">
              <PeopleAccessSection resourceType={resourceType} resourceId={resourceId} shares={shares} />

              {sharesQuery.hasNextPage && !sharesQuery.isFetchNextPageError && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  disabled={sharesQuery.isFetchingNextPage}
                  onClick={() => sharesQuery.fetchNextPage()}
                >
                  Show more
                </Button>
              )}

              {sharesQuery.isFetchingNextPage && <p className="mt-2 text-sm text-muted-foreground">Loading...</p>}

              {sharesQuery.isFetchNextPageError && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Could not load more.</span>
                  <Button variant="outline" size="sm" onClick={() => sharesQuery.fetchNextPage()}>
                    Retry
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
