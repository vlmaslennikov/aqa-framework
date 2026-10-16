import { Link } from "react-router-dom";
import { DownloadIcon, FileTextIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/lib/format";

interface PdfViewerProps {
  fileName: string;
  size?: number;
  viewUrl: string | undefined;
  viewUrlError: boolean;
  onRetryView: () => void;
  isRetrying?: boolean;
  onDownload: () => void;
  downloadPending: boolean;
  onClose?: { to: string };
}

export function PdfViewer({
  fileName,
  size,
  viewUrl,
  viewUrlError,
  onRetryView,
  isRetrying,
  onDownload,
  downloadPending,
  onClose,
}: PdfViewerProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{fileName}</span>
          {typeof size === "number" && (
            <span className="shrink-0 text-sm text-muted-foreground">{formatBytes(size)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={downloadPending} onClick={onDownload}>
            <DownloadIcon /> {downloadPending ? "Preparing..." : "Download"}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              render={<Link to={onClose.to} />}
            >
              <XIcon />
            </Button>
          )}
        </div>
      </div>

      {viewUrlError ? (
        <div className="flex h-[75vh] flex-col items-center justify-center gap-3 rounded-md border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">Could not load this file for preview.</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={isRetrying} onClick={onRetryView}>
              {isRetrying ? "Retrying..." : "Retry"}
            </Button>
            <Button size="sm" disabled={downloadPending} onClick={onDownload}>
              <DownloadIcon /> {downloadPending ? "Preparing..." : "Download instead"}
            </Button>
          </div>
        </div>
      ) : viewUrl === undefined ? (
        <Skeleton className="h-[75vh] w-full" />
      ) : (
        <object data={viewUrl} type="application/pdf" className="h-[75vh] w-full rounded-md border">
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">This browser can't preview PDFs inline.</p>
            <Button onClick={onDownload} disabled={downloadPending}>
              <DownloadIcon /> {downloadPending ? "Preparing..." : "Download to view"}
            </Button>
          </div>
        </object>
      )}
    </div>
  );
}
