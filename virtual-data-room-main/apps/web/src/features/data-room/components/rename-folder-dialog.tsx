import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/form-field";
import { getErrorMessage } from "@/lib/api";
import { renameFolder, type FolderItem } from "@/features/data-room/api";
import { breadcrumbsKey, contentsKey, foldersKeyPrefix } from "@/features/data-room/hooks";
import { folderNameSchema, type FolderNameValues } from "@/features/data-room/schemas";

interface RenameFolderDialogProps {
  folder: FolderItem | null;
  dataRoomId: string;
  listingFolderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameFolderDialog({
  folder,
  dataRoomId,
  listingFolderId,
  open,
  onOpenChange,
}: RenameFolderDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FolderNameValues>({
    resolver: zodResolver(folderNameSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (open && folder) reset({ name: folder.name });
  }, [open, folder, reset]);

  const mutation = useMutation({
    mutationFn: (values: FolderNameValues) => renameFolder(folder!.id, values.name),
    onSuccess: () => {
      toast.success("Folder renamed");
      queryClient.invalidateQueries({ queryKey: contentsKey(dataRoomId, listingFolderId) });
      queryClient.invalidateQueries({ queryKey: breadcrumbsKey(folder!.id) });
      queryClient.invalidateQueries({ queryKey: foldersKeyPrefix });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not rename the folder"));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename folder</DialogTitle>
        </DialogHeader>

        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <FormField
            id="rename-folder-name"
            label="Folder name"
            autoFocus
            disabled={mutation.isPending}
            error={errors.name?.message}
            {...register("name")}
          />

          <DialogFooter>
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
