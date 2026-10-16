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
import { createFolder } from "@/features/data-room/api";
import { contentsKey, foldersKeyPrefix } from "@/features/data-room/hooks";
import { folderNameSchema, type FolderNameValues } from "@/features/data-room/schemas";

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataRoomId: string;
  parentId: string | null;
}

export function CreateFolderDialog({ open, onOpenChange, dataRoomId, parentId }: CreateFolderDialogProps) {
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
    if (open) reset({ name: "" });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: FolderNameValues) =>
      createFolder({ name: values.name, dataRoomId, parentId: parentId ?? undefined }),
    onSuccess: () => {
      toast.success("Folder created");
      queryClient.invalidateQueries({ queryKey: contentsKey(dataRoomId, parentId) });
      queryClient.invalidateQueries({ queryKey: foldersKeyPrefix });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not create the folder"));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
        </DialogHeader>

        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <FormField
            id="create-folder-name"
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
              {mutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
