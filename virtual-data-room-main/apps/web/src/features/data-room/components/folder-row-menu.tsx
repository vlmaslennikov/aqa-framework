import { MoreVerticalIcon, PencilIcon, Share2Icon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderRowMenuProps {
  folderName: string;
  onRename: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export function FolderRowMenu({ folderName, onRename, onShare, onDelete }: FolderRowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${folderName}`} />}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuItem onClick={onRename}>
          <PencilIcon /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShare}>
          <Share2Icon /> Share
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2Icon /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
