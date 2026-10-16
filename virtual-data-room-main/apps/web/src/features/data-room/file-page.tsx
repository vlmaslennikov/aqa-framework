import { Navigate, useLocation, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { PageLoadError } from "@/components/page-load-error";
import { PdfViewer } from "@/components/pdf-viewer";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage, isNotFoundError } from "@/lib/api";
import { SHARED_SECTION_PREFIX, useSectionPrefix, withSection } from "@/lib/section";
import { fetchFile, fetchFileViewUrl, getFileDownloadUrl } from "@/features/data-room/api";
import { FileNotFound } from "@/features/data-room/components/file-not-found";
import { useDataRoomDetail } from "@/features/sharing/hooks";

function FilePageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-[75vh] w-full" />
    </div>
  );
}

export function FilePage() {
  const { id = "" } = useParams<{ id: string }>();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const prefix = useSectionPrefix();

  const fileQuery = useQuery({
    queryKey: ["file", id],
    queryFn: () => fetchFile(id),
    enabled: !!id,
    retry: false,
  });

  const roomDetailQuery = useDataRoomDetail(fileQuery.data?.dataRoomId ?? "", { enabled: fileQuery.isSuccess });

  const viewUrlQuery = useQuery({
    queryKey: ["file-view-url", id],
    queryFn: () => fetchFileViewUrl(id),
    enabled: !!id && fileQuery.isSuccess,
    retry: false,
  });

  const downloadMutation = useMutation({
    mutationFn: () => getFileDownloadUrl(id),
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not get a download link"));
    },
  });

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />

      <main className="flex flex-1 flex-col">
        {fileQuery.isPending && <FilePageSkeleton />}

        {fileQuery.isError &&
          (isNotFoundError(fileQuery.error) ? (
            <FileNotFound />
          ) : (
            <PageLoadError message="Could not load this file." onRetry={() => fileQuery.refetch()} />
          ))}

        {fileQuery.isSuccess &&
          (() => {
            let canonicalPrefix: string | null = null;
            if (roomDetailQuery.isSuccess) {
              canonicalPrefix = roomDetailQuery.data.accessLevel === "OWNER" ? "" : SHARED_SECTION_PREFIX;
            } else if (roomDetailQuery.isError && isNotFoundError(roomDetailQuery.error)) {
              canonicalPrefix = SHARED_SECTION_PREFIX;
            }

            if (canonicalPrefix !== null && canonicalPrefix !== prefix) {
              return <Navigate to={withSection(canonicalPrefix, `/file/${id}`)} replace />;
            }

            return (
              <PdfViewer
                fileName={fileQuery.data.name}
                size={fileQuery.data.size}
                viewUrl={viewUrlQuery.data}
                viewUrlError={viewUrlQuery.isError}
                onRetryView={() => viewUrlQuery.refetch()}
                isRetrying={viewUrlQuery.isFetching}
                onDownload={() => downloadMutation.mutate()}
                downloadPending={downloadMutation.isPending}
                onClose={{
                  to:
                    from ??
                    withSection(
                      prefix,
                      fileQuery.data.folderId ? `/folder/${fileQuery.data.folderId}` : `/room/${fileQuery.data.dataRoomId}`
                    ),
                }}
              />
            );
          })()}
      </main>
    </div>
  );
}
