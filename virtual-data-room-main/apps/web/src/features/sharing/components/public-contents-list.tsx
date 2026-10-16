import { DownloadIcon, FileTextIcon, FolderIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBytes, formatDate } from "@/lib/format";
import type { ContentItem } from "@/features/data-room/api";

interface PublicContentsListProps {
  items: ContentItem[];
  downloadingFileId: string | null;
  onOpenFolder: (folderId: string) => void;
  onOpenFile: (fileId: string) => void;
  onDownloadFile: (fileId: string) => void;
}

export function PublicContentsList({
  items,
  downloadingFileId,
  onOpenFolder,
  onOpenFile,
  onDownloadFile,
}: PublicContentsListProps) {
  return (
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
            <TableRow key={item.id} className="cursor-pointer" onClick={() => onOpenFolder(item.id)}>
              <TableCell className="font-medium">
                <span className="flex items-center gap-2">
                  <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
                  {item.name}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
              <TableCell />
            </TableRow>
          ) : (
            <TableRow key={item.id} className="cursor-pointer" onClick={() => onOpenFile(item.id)}>
              <TableCell className="font-medium">
                <span className="flex items-center gap-2">
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                  {item.name}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatBytes(item.size)}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Download ${item.name}`}
                  disabled={downloadingFileId === item.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDownloadFile(item.id);
                  }}
                >
                  <DownloadIcon />
                </Button>
              </TableCell>
            </TableRow>
          )
        )}
      </TableBody>
    </Table>
  );
}
