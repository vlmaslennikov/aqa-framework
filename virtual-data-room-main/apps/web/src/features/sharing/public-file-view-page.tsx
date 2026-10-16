import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageLoadError } from "@/components/page-load-error";
import { PdfViewer } from "@/components/pdf-viewer";
import { getErrorMessage, isGoneError, isNotFoundError } from "@/lib/api";
import {
  fetchPublicFileDownloadUrl,
  fetchPublicFileSummary,
  fetchPublicFileViewUrl,
} from "@/features/sharing/api";
import { PublicShareError } from "@/features/sharing/components/public-share-error";
import { PublicShareHeader } from "@/features/sharing/components/public-share-header";
import { PublicShareSkeleton } from "@/features/sharing/components/public-share-skeleton";

export function PublicFileViewPage() {
  const { token = "", fileId = "" } = useParams<{ token: string; fileId: string }>();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const backTo = from ?? `/share/${token}`;

  const summaryQuery = useQuery({
    queryKey: ["public-file", token, fileId],
    queryFn: () => fetchPublicFileSummary(token, fileId),
    retry: (failureCount, error) => !isGoneError(error) && !isNotFoundError(error) && failureCount < 3,
  });

  const viewUrlQuery = useQuery({
    queryKey: ["public-file-view-url", token, fileId],
    queryFn: () => fetchPublicFileViewUrl(token, fileId),
    enabled: summaryQuery.isSuccess,
    retry: false,
  });

  const downloadMutation = useMutation({
    mutationFn: () => fetchPublicFileDownloadUrl(token, fileId),
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not get a download link"));
    },
  });

  return (
    <div className="flex min-h-svh flex-col">
      <PublicShareHeader />

      <main className="flex flex-1 flex-col">
        {summaryQuery.isPending && <PublicShareSkeleton />}

        {summaryQuery.isError &&
          (isGoneError(summaryQuery.error) ? (
            <PublicShareError revoked />
          ) : isNotFoundError(summaryQuery.error) ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-base font-medium">File not found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                This file does not exist, or the link no longer covers it.
              </p>
              <Button render={<Link to={backTo} />} variant="outline">
                Back
              </Button>
            </div>
          ) : (
            <PageLoadError message="Could not load this file." onRetry={() => summaryQuery.refetch()} />
          ))}

        {summaryQuery.isSuccess && (
          <PdfViewer
            fileName={summaryQuery.data.name}
            size={summaryQuery.data.size}
            viewUrl={viewUrlQuery.data}
            viewUrlError={viewUrlQuery.isError}
            onRetryView={() => viewUrlQuery.refetch()}
            isRetrying={viewUrlQuery.isFetching}
            onDownload={() => downloadMutation.mutate()}
            downloadPending={downloadMutation.isPending}
            onClose={{ to: backTo }}
          />
        )}
      </main>
    </div>
  );
}
