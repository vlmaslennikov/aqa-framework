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
import { deleteFile, type FileItem } from "@/features/data-room/api";
import { contentsKey } from "@/features/data-room/hooks";

interface DeleteFileDialogProps {
  file: FileItem | null;
  dataRoomId: string;
  listingFolderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteFileDialog({ file, dataRoomId, listingFolderId, open, onOpenChange }: DeleteFileDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteFile(file!.id),
    onSuccess: () => {
      toast.success(`"${file?.name}" deleted`);
      queryClient.invalidateQueries({ queryKey: contentsKey(dataRoomId, listingFolderId) });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not delete the file"));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete "{file?.name}"?</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
