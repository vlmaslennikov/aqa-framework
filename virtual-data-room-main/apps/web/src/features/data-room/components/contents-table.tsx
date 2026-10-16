import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { FileTextIcon, FolderIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/format";
import { useSectionPrefix, withSection } from "@/lib/section";
import { getFileDownloadUrl, type AccessLevel, type FileItem, type FolderItem } from "@/features/data-room/api";
import type { ContentsQuery } from "@/features/data-room/hooks";
import { ContentsRowsSkeleton, ContentsTableSkeleton } from "@/features/data-room/components/contents-table-skeleton";
import { DeleteFileDialog } from "@/features/data-room/components/delete-file-dialog";
import { DeleteFolderDialog } from "@/features/data-room/components/delete-folder-dialog";
import { EmptyFolderState } from "@/features/data-room/components/empty-folder-state";
import { FileRowMenu } from "@/features/data-room/components/file-row-menu";
import { FolderRowMenu } from "@/features/data-room/components/folder-row-menu";
import { MoveFileDialog } from "@/features/data-room/components/move-file-dialog";
import { RenameFileDialog } from "@/features/data-room/components/rename-file-dialog";
import { RenameFolderDialog } from "@/features/data-room/components/rename-folder-dialog";
import { useIntersectionObserver } from "@/lib/use-intersection-observer";
import type { ResourceType } from "@/features/sharing/api";
import { ShareDialog } from "@/features/sharing/components/share-dialog";

interface ContentsTableProps {
  dataRoomId: string;
  folderId: string | null;
  query: ContentsQuery;
  accessLevel: AccessLevel;
  onCreateFolder: () => void;
  onUploadClick: () => void;
}

interface ShareTarget {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
}

export function ContentsTable({ dataRoomId, folderId, query, accessLevel, onCreateFolder, onUploadClick }: ContentsTableProps) {
  const navigate = useNavigate();
  const prefix = useSectionPrefix();
  const canManage = accessLevel === "OWNER";
  const [renameTarget, setRenameTarget] = useState<FolderItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FolderItem | null>(null);
  const [renameFileTarget, setRenameFileTarget] = useState<FileItem | null>(null);
  const [moveFileTarget, setMoveFileTarget] = useState<FileItem | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<FileItem | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);

  const downloadMutation = useMutation({
    mutationFn: (fileId: string) => getFileDownloadUrl(fileId),
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not get a download link"));
    },
  });

  const { isPending, isError, data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;

  const sentinelRef = useIntersectionObserver<HTMLTableRowElement>(
    () => {
      if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) fetchNextPage();
    },
    hasNextPage,
    data?.pages.length
  );

  if (isPending) {
    return <ContentsTableSkeleton />;
  }

  if (isError && !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
        <p className="text-sm text-muted-foreground">Could not load this folder's contents.</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const items = data.pages.flatMap((page) => page.items);

  if (items.length === 0 && !hasNextPage) {
    return <EmptyFolderState canManage={canManage} onCreateFolder={onCreateFolder} onUploadClick={onUploadClick} />;
  }

  const canLoadMore = hasNextPage && !isFetchNextPageError;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Modified</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) =>
            item.type === "folder" ? (
              <FolderRow
                key={item.id}
                folder={item}
                canManage={canManage}
                onOpen={() => navigate(withSection(prefix, `/folder/${item.id}`))}
                onRename={() => setRenameTarget(item)}
                onShare={() => setShareTarget({ resourceType: "FOLDER", resourceId: item.id, resourceName: item.name })}
                onDelete={() => setDeleteTarget(item)}
              />
            ) : (
              <FileRow
                key={item.id}
                file={item}
                canManage={canManage}
                downloadPending={downloadMutation.isPending && downloadMutation.variables === item.id}
                onOpen={() =>
                  navigate(withSection(prefix, `/file/${item.id}`), {
                    state: {
                      from: withSection(prefix, folderId ? `/folder/${folderId}` : `/room/${dataRoomId}`),
                    },
                  })
                }
                onRename={() => setRenameFileTarget(item)}
                onMove={() => setMoveFileTarget(item)}
                onDownload={() => downloadMutation.mutate(item.id)}
                onShare={() => setShareTarget({ resourceType: "FILE", resourceId: item.id, resourceName: item.name })}
                onDelete={() => setDeleteFileTarget(item)}
              />
            )
          )}

          {isFetchingNextPage && <ContentsRowsSkeleton />}

          {hasNextPage && (
            <TableRow ref={sentinelRef} className="hover:bg-transparent">
              <TableCell colSpan={4} className="h-1 p-0" />
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col items-center gap-2 py-2">
        {isFetchNextPageError && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Could not load more items.</span>
            <Button variant="outline" size="sm" onClick={() => fetchNextPage()}>
              Retry
            </Button>
          </div>
        )}

        {canLoadMore && (
          <Button variant="outline" size="sm" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        )}
      </div>

      <RenameFolderDialog
        folder={renameTarget}
        dataRoomId={dataRoomId}
        listingFolderId={folderId}
        open={renameTarget !== null}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      />
      <DeleteFolderDialog
        folder={deleteTarget}
        dataRoomId={dataRoomId}
        listingFolderId={folderId}
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
      <RenameFileDialog
        file={renameFileTarget}
        dataRoomId={dataRoomId}
        listingFolderId={folderId}
        open={renameFileTarget !== null}
        onOpenChange={(open) => !open && setRenameFileTarget(null)}
      />
      <MoveFileDialog
        file={moveFileTarget}
        dataRoomId={dataRoomId}
        open={moveFileTarget !== null}
        onOpenChange={(open) => !open && setMoveFileTarget(null)}
      />
      <DeleteFileDialog
        file={deleteFileTarget}
        dataRoomId={dataRoomId}
        listingFolderId={folderId}
        open={deleteFileTarget !== null}
        onOpenChange={(open) => !open && setDeleteFileTarget(null)}
      />
      {shareTarget && (
        <ShareDialog
          resourceType={shareTarget.resourceType}
          resourceId={shareTarget.resourceId}
          resourceName={shareTarget.resourceName}
          open={shareTarget !== null}
          onOpenChange={(open) => !open && setShareTarget(null)}
        />
      )}
    </>
  );
}

function FolderRow({
  folder,
  canManage,
  onOpen,
  onRename,
  onShare,
  onDelete,
}: {
  folder: FolderItem;
  canManage: boolean;
  onOpen: () => void;
  onRename: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="font-medium">
        <span className="flex items-center gap-2">
          <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
          {folder.name}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(folder.createdAt)}</TableCell>
      <TableCell className="text-right">
        {canManage && <FolderRowMenu folderName={folder.name} onRename={onRename} onShare={onShare} onDelete={onDelete} />}
      </TableCell>
    </TableRow>
  );
}

function FileRow({
  file,
  canManage,
  downloadPending,
  onOpen,
  onRename,
  onMove,
  onDownload,
  onShare,
  onDelete,
}: {
  file: FileItem;
  canManage: boolean;
  downloadPending: boolean;
  onOpen: () => void;
  onRename: () => void;
  onMove: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="font-medium">
        <span className="flex items-center gap-2">
          <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
          {file.name}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">{formatBytes(file.size)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(file.createdAt)}</TableCell>
      <TableCell className="text-right">
        <FileRowMenu
          fileName={file.name}
          canManage={canManage}
          downloadPending={downloadPending}
          onRename={onRename}
          onMove={onMove}
          onDownload={onDownload}
          onShare={onShare}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
}
