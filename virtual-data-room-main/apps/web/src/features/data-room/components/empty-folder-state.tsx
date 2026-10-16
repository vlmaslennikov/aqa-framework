import { FolderPlusIcon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyFolderStateProps {
  canManage: boolean;
  onCreateFolder: () => void;
  onUploadClick: () => void;
}

export function EmptyFolderState({ canManage, onCreateFolder, onUploadClick }: EmptyFolderStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
      <UploadIcon className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium">This folder is empty</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        {canManage
          ? "Drag PDF files here to upload, or create a folder to start organizing this data room."
          : "There is nothing here yet."}
      </p>
      {canManage && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onUploadClick}>
            <UploadIcon /> Upload
          </Button>
          <Button variant="outline" size="sm" onClick={onCreateFolder}>
            <FolderPlusIcon /> New folder
          </Button>
        </div>
      )}
    </div>
  );
}
