import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { isGoneError, isNotFoundError } from "@/lib/api";
import { fetchPublicShare } from "@/features/sharing/api";
import { PublicContentsBrowser } from "@/features/sharing/components/public-contents-browser";
import { PublicFileCard } from "@/features/sharing/components/public-file-card";
import { PublicShareError } from "@/features/sharing/components/public-share-error";
import { PublicShareHeader } from "@/features/sharing/components/public-share-header";
import { PublicShareSkeleton } from "@/features/sharing/components/public-share-skeleton";

export function PublicSharePage() {
  const { token = "", folderId } = useParams<{ token: string; folderId?: string }>();

  const summaryQuery = useQuery({
    queryKey: ["public-share", token],
    queryFn: () => fetchPublicShare(token),
    retry: (failureCount, error) => !isGoneError(error) && !isNotFoundError(error) && failureCount < 3,
  });

  return (
    <div className="flex min-h-svh flex-col">
      <PublicShareHeader />

      <main className="flex flex-1 flex-col">
        {summaryQuery.isPending && <PublicShareSkeleton />}

        {summaryQuery.isError && (
          <PublicShareError
            revoked={isGoneError(summaryQuery.error)}
            onRetry={isGoneError(summaryQuery.error) ? undefined : () => summaryQuery.refetch()}
          />
        )}

        {summaryQuery.isSuccess &&
          (summaryQuery.data.resourceType === "FILE" ? (
            <PublicFileCard token={token} summary={summaryQuery.data} />
          ) : (
            <PublicContentsBrowser
              token={token}
              rootResourceName={summaryQuery.data.resourceName}
              isDataRoomRoot={summaryQuery.data.resourceType === "DATAROOM" && !folderId}
              listFolderId={folderId ?? (summaryQuery.data.resourceType === "FOLDER" ? summaryQuery.data.resourceId : null)}
              showBackLink={Boolean(folderId)}
            />
          ))}
      </main>
    </div>
  );
}
