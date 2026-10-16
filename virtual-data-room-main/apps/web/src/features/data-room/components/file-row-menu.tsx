import { DownloadIcon, FolderInputIcon, MoreVerticalIcon, PencilIcon, Share2Icon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileRowMenuProps {
  fileName: string;
  downloadPending: boolean;
  canManage: boolean;
  onRename: () => void;
  onMove: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export function FileRowMenu({
  fileName,
  downloadPending,
  canManage,
  onRename,
  onMove,
  onDownload,
  onShare,
  onDelete,
}: FileRowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${fileName}`} />}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        {canManage && (
          <DropdownMenuItem onClick={onRename}>
            <PencilIcon /> Rename
          </DropdownMenuItem>
        )}
        {canManage && (
          <DropdownMenuItem onClick={onMove}>
            <FolderInputIcon /> Move
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled={downloadPending} onClick={onDownload}>
          <DownloadIcon /> {downloadPending ? "Preparing..." : "Download"}
        </DropdownMenuItem>
        {canManage && (
          <DropdownMenuItem onClick={onShare}>
            <Share2Icon /> Share
          </DropdownMenuItem>
        )}
        {canManage && (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
