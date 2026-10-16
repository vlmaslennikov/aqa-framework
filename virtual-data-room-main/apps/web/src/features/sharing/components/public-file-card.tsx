import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { PdfViewer } from "@/components/pdf-viewer";
import { getErrorMessage } from "@/lib/api";
import { fetchPublicFileDownloadUrl, fetchPublicFileViewUrl, type PublicShareSummary } from "@/features/sharing/api";

interface PublicFileCardProps {
  token: string;
  summary: PublicShareSummary;
}

export function PublicFileCard({ token, summary }: PublicFileCardProps) {
  const viewUrlQuery = useQuery({
    queryKey: ["public-file-view-url", token, summary.resourceId],
    queryFn: () => fetchPublicFileViewUrl(token, summary.resourceId),
    retry: false,
  });

  const downloadMutation = useMutation({
    mutationFn: () => fetchPublicFileDownloadUrl(token, summary.resourceId),
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not get a download link"));
    },
  });

  return (
    <PdfViewer
      fileName={summary.resourceName}
      size={summary.size}
      viewUrl={viewUrlQuery.data}
      viewUrlError={viewUrlQuery.isError}
      onRetryView={() => viewUrlQuery.refetch()}
      isRetrying={viewUrlQuery.isFetching}
      onDownload={() => downloadMutation.mutate()}
      downloadPending={downloadMutation.isPending}
    />
  );
}
