import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { FolderPlusIcon, Share2Icon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AccessLevel, BreadcrumbFolder } from "@/features/data-room/api";
import { BreadcrumbsBar } from "@/features/data-room/components/breadcrumbs-bar";
import { ContentsTable } from "@/features/data-room/components/contents-table";
import { CreateFolderDialog } from "@/features/data-room/components/create-folder-dialog";
import { useFolderContents } from "@/features/data-room/hooks";
import { UploadPanel } from "@/features/data-room/upload/upload-panel";
import { useUploadQueue } from "@/features/data-room/upload/use-upload-queue";
import { ShareDialog } from "@/features/sharing/components/share-dialog";

interface FolderExplorerProps {
  dataRoomId: string;
  dataRoomName: string | null;
  folderId: string | null;
  breadcrumbFolders: BreadcrumbFolder[];
  accessLevel: AccessLevel;
}

export function FolderExplorer({
  dataRoomId,
  dataRoomName,
  folderId,
  breadcrumbFolders,
  accessLevel,
}: FolderExplorerProps) {
  const canManage = accessLevel === "OWNER";
  const contentsQuery = useFolderContents(dataRoomId, folderId);
  const [createOpen, setCreateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { tasks, enqueue, retry, clearFinished } = useUploadQueue(dataRoomId, folderId);

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!canManage) return;
    event.preventDefault();
    if (!event.dataTransfer.types.includes("Files")) return;
    dragCounter.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!canManage) return;
    event.preventDefault();
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!canManage) return;
    event.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!canManage) return;
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    enqueue(Array.from(event.dataTransfer.files));
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) enqueue(Array.from(event.target.files));
    event.target.value = "";
  }

  return (
    <div
      className="relative flex flex-1 flex-col gap-4 p-6"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BreadcrumbsBar
          accessLevel={accessLevel}
          dataRoomId={dataRoomId}
          dataRoomName={dataRoomName}
          folders={breadcrumbFolders}
        />
        {canManage && (
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Drag &amp; drop PDF files anywhere to upload
            </span>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <UploadIcon /> Upload
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <FolderPlusIcon /> New folder
            </Button>
            <Button size="sm" onClick={() => setShareOpen(true)}>
              <Share2Icon /> Share
            </Button>
          </div>
        )}
      </div>

      {canManage && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf"
          className="hidden"
          onChange={handleFileInputChange}
        />
      )}

      <ContentsTable
        dataRoomId={dataRoomId}
        folderId={folderId}
        query={contentsQuery}
        accessLevel={accessLevel}
        onCreateFolder={() => setCreateOpen(true)}
        onUploadClick={() => fileInputRef.current?.click()}
      />

      {canManage && (
        <>
          <CreateFolderDialog open={createOpen} onOpenChange={setCreateOpen} dataRoomId={dataRoomId} parentId={folderId} />

          <ShareDialog
            resourceType={folderId ? "FOLDER" : "DATAROOM"}
            resourceId={folderId ?? dataRoomId}
            resourceName={folderId ? breadcrumbFolders.at(-1)?.name ?? dataRoomName ?? "" : dataRoomName ?? ""}
            open={shareOpen}
            onOpenChange={setShareOpen}
          />

          <UploadPanel tasks={tasks} onRetry={retry} onClose={clearFinished} />
        </>
      )}

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10">
          <div className="flex flex-col items-center gap-2 rounded-xl border bg-background/95 px-10 py-8 shadow-lg">
            <UploadIcon className="size-8 text-primary" />
            <p className="text-base font-medium">Drop PDF files to upload</p>
          </div>
        </div>
      )}
    </div>
  );
}
