import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ChevronRightIcon, DatabaseIcon, DownloadIcon, FileTextIcon, FolderIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useSectionPrefix, withSection } from "@/lib/section";
import { getFileDownloadUrl } from "@/features/data-room/api";
import type { ReceivedShare } from "@/features/sharing/api";

interface ReceivedShareRowProps {
  share: ReceivedShare;
}

const RESOURCE_ICON = {
  DATAROOM: DatabaseIcon,
  FOLDER: FolderIcon,
  FILE: FileTextIcon,
} as const;

export function ReceivedShareRow({ share }: ReceivedShareRowProps) {
  const navigate = useNavigate();
  const prefix = useSectionPrefix();
  const Icon = RESOURCE_ICON[share.resourceType];

  const downloadMutation = useMutation({
    mutationFn: () => getFileDownloadUrl(share.resourceId),
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not get a download link"));
    },
  });

  const rowContent = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="size-5 shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{share.resourceName}</span>
          <span className="text-xs text-muted-foreground">Shared {formatDate(share.sharedAt)}</span>
        </div>
      </div>

      {share.resourceType === "FILE" && (
        <Button
          variant="outline"
          size="sm"
          disabled={downloadMutation.isPending}
          onClick={(event) => {
            event.stopPropagation();
            downloadMutation.mutate();
          }}
        >
          <DownloadIcon /> {downloadMutation.isPending ? "Preparing..." : "Download"}
        </Button>
      )}
    </>
  );

  const target = withSection(
    prefix,
    share.resourceType === "DATAROOM"
      ? `/room/${share.resourceId}`
      : share.resourceType === "FOLDER"
        ? `/folder/${share.resourceId}`
        : `/file/${share.resourceId}`
  );

  function open() {
    navigate(target, share.resourceType === "FILE" ? { state: { from: "/shared-with-me" } } : undefined);
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target === event.currentTarget) open();
      }}
      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
    >
      {rowContent}
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}
