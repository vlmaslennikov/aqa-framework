import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage, isGoneError, isNotFoundError } from "@/lib/api";
import {
  fetchPublicFileDownloadUrl,
  fetchPublicFolderContents,
  fetchPublicRootContents,
} from "@/features/sharing/api";
import { PublicContentsList } from "@/features/sharing/components/public-contents-list";
import { PublicShareError } from "@/features/sharing/components/public-share-error";
import { useIntersectionObserver } from "@/lib/use-intersection-observer";

interface PublicContentsBrowserProps {
  token: string;
  rootResourceName: string;
  isDataRoomRoot: boolean;
  listFolderId: string | null;
  showBackLink: boolean;
}

export function PublicContentsBrowser({
  token,
  rootResourceName,
  isDataRoomRoot,
  listFolderId,
  showBackLink,
}: PublicContentsBrowserProps) {
  const navigate = useNavigate();
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const contentsQuery = useInfiniteQuery({
    queryKey: ["public-contents", token, isDataRoomRoot ? "root" : listFolderId],
    queryFn: ({ pageParam }) =>
      isDataRoomRoot
        ? fetchPublicRootContents(token, { cursor: pageParam })
        : fetchPublicFolderContents(token, listFolderId!, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: (failureCount, error) => !isGoneError(error) && !isNotFoundError(error) && failureCount < 3,
  });

  const downloadMutation = useMutation({
    mutationFn: (fileId: string) => fetchPublicFileDownloadUrl(token, fileId),
    onMutate: (fileId) => setDownloadingFileId(fileId),
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not get a download link"));
    },
    onSettled: () => setDownloadingFileId(null),
  });

  const items = contentsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const sentinelRef = useIntersectionObserver<HTMLDivElement>(
    () => {
      if (contentsQuery.hasNextPage && !contentsQuery.isFetchingNextPage && !contentsQuery.isFetchNextPageError) {
        contentsQuery.fetchNextPage();
      }
    },
    contentsQuery.hasNextPage,
    contentsQuery.data?.pages.length
  );

  if (contentsQuery.isError && !contentsQuery.data && isGoneError(contentsQuery.error)) {
    return <PublicShareError revoked />;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        {showBackLink ? (
          <Button variant="ghost" size="sm" className="w-fit" render={<Link to={`/share/${token}`} />}>
            <ArrowLeftIcon /> Back to {rootResourceName}
          </Button>
        ) : (
          <h1 className="text-lg font-semibold">{rootResourceName}</h1>
        )}
      </div>

      {contentsQuery.isPending && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      )}

      {contentsQuery.isError && !contentsQuery.data && isNotFoundError(contentsQuery.error) && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">This folder is no longer available.</p>
          <Button variant="outline" size="sm" render={<Link to={`/share/${token}`} />}>
            Back to {rootResourceName}
          </Button>
        </div>
      )}

      {contentsQuery.isError && !contentsQuery.data && !isNotFoundError(contentsQuery.error) && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">Could not load this folder's contents.</p>
          <Button variant="outline" size="sm" onClick={() => contentsQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {contentsQuery.data && (
        <>
          {items.length === 0 && !contentsQuery.hasNextPage ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-12 text-center">
              <p className="text-sm font-medium">This folder is empty</p>
            </div>
          ) : (
            <PublicContentsList
              items={items}
              downloadingFileId={downloadingFileId}
              onOpenFolder={(folderId) => navigate(`/share/${token}/folders/${folderId}`)}
              onOpenFile={(fileId) =>
                navigate(`/share/${token}/files/${fileId}`, {
                  state: { from: isDataRoomRoot ? `/share/${token}` : `/share/${token}/folders/${listFolderId}` },
                })
              }
              onDownloadFile={(fileId) => downloadMutation.mutate(fileId)}
            />
          )}

          {contentsQuery.hasNextPage && <div ref={sentinelRef} className="h-1" />}

          <div className="flex flex-col items-center gap-2 py-2">
            {contentsQuery.isFetchNextPageError && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Could not load more items.</span>
                <Button variant="outline" size="sm" onClick={() => contentsQuery.fetchNextPage()}>
                  Retry
                </Button>
              </div>
            )}

            {contentsQuery.hasNextPage && !contentsQuery.isFetchNextPageError && (
              <Button
                variant="outline"
                size="sm"
                disabled={contentsQuery.isFetchingNextPage}
                onClick={() => contentsQuery.fetchNextPage()}
              >
                {contentsQuery.isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
