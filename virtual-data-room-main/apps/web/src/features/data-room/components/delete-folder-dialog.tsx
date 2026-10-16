import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { deleteFolder, type DeletePreview, type FolderItem } from "@/features/data-room/api";
import { contentsKey, foldersKeyPrefix, useDeletePreview } from "@/features/data-room/hooks";

interface DeleteFolderDialogProps {
  folder: FolderItem | null;
  dataRoomId: string;
  listingFolderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteFolderDialog({
  folder,
  dataRoomId,
  listingFolderId,
  open,
  onOpenChange,
}: DeleteFolderDialogProps) {
  const queryClient = useQueryClient();
  const previewQuery = useDeletePreview(open ? (folder?.id ?? null) : null);

  const mutation = useMutation({
    mutationFn: () => deleteFolder(folder!.id),
    onSuccess: () => {
      toast.success(`"${folder?.name}" deleted`);
      queryClient.invalidateQueries({ queryKey: contentsKey(dataRoomId, listingFolderId) });
      queryClient.invalidateQueries({ queryKey: foldersKeyPrefix });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not delete the folder"));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete "{folder?.name}"?</DialogTitle>
          <DialogDescription>
            {previewQuery.isPending && "Checking folder contents..."}
            {previewQuery.isError && "Could not check what's inside this folder."}
            {previewQuery.isSuccess && describeDeletePreview(previewQuery.data)}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending || previewQuery.isFetching}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function describeDeletePreview(preview: DeletePreview): string {
  if (preview.folderCount === 0 && preview.fileCount === 0) {
    return "This folder is empty. This action cannot be undone.";
  }

  const parts: string[] = [];
  if (preview.folderCount > 0) {
    parts.push(`${preview.folderCount} subfolder${preview.folderCount === 1 ? "" : "s"}`);
  }
  if (preview.fileCount > 0) {
    parts.push(`${preview.fileCount} file${preview.fileCount === 1 ? "" : "s"}`);
  }
  const sizeSuffix = preview.totalSize > 0 ? ` (${formatBytes(preview.totalSize)})` : "";

  return `This will permanently delete ${parts.join(" and ")}${sizeSuffix}. This action cannot be undone.`;
}
