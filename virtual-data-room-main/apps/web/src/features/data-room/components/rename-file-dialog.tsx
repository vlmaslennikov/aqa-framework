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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/api";
import { renameFile, type FileItem } from "@/features/data-room/api";
import { splitFileName } from "@/features/data-room/file-name";
import { contentsKey } from "@/features/data-room/hooks";
import { fileBaseNameSchema, type FileBaseNameValues } from "@/features/data-room/schemas";

interface RenameFileDialogProps {
  file: FileItem | null;
  dataRoomId: string;
  listingFolderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameFileDialog({ file, dataRoomId, listingFolderId, open, onOpenChange }: RenameFileDialogProps) {
  const queryClient = useQueryClient();
  const { ext } = file ? splitFileName(file.name) : { ext: "" };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FileBaseNameValues>({
    resolver: zodResolver(fileBaseNameSchema),
    defaultValues: { baseName: "" },
  });

  useEffect(() => {
    if (open && file) reset({ baseName: splitFileName(file.name).base });
  }, [open, file, reset]);

  const mutation = useMutation({
    mutationFn: (baseName: string) => renameFile(file!.id, `${baseName}${ext}`),
    onSuccess: (updated, baseName) => {
      const submittedName = `${baseName}${ext}`;
      toast.success(
        updated.name !== submittedName ? `Renamed to "${updated.name}" to avoid a naming conflict` : "File renamed"
      );
      queryClient.invalidateQueries({ queryKey: contentsKey(dataRoomId, listingFolderId) });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not rename the file"));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename file</DialogTitle>
        </DialogHeader>

        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => mutation.mutate(values.baseName))}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rename-file-name">File name</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="rename-file-name"
                autoFocus
                disabled={mutation.isPending}
                aria-invalid={Boolean(errors.baseName)}
                aria-describedby={errors.baseName ? "rename-file-name-error" : undefined}
                {...register("baseName")}
              />
              {ext && <span className="shrink-0 text-sm text-muted-foreground">{ext}</span>}
            </div>
            {errors.baseName && (
              <p id="rename-file-name-error" className="text-sm text-destructive">
                {errors.baseName.message}
              </p>
            )}
          </div>

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
