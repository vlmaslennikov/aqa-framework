import { PrismaService } from '@/prisma/prisma.service';
import {
  ContentsCursor,
  DEFAULT_LIMIT,
  encodeCursor,
  Page,
} from '@/common/pagination';

export type ContentItem =
  | {
      type: 'folder';
      id: string;
      name: string;
      parentId: string | null;
      createdAt: Date;
    }
  | {
      type: 'file';
      id: string;
      name: string;
      folderId: string | null;
      size: number;
      mimeType: string;
      createdAt: Date;
    };

interface FolderRow {
  id: string;
  name: string;
  nameLower: string;
  parentId: string | null;
  createdAt: Date;
}

interface FileRow {
  id: string;
  name: string;
  nameLower: string;
  folderId: string | null;
  size: number;
  mimeType: string;
  createdAt: Date;
}

const FOLDER_SELECT = {
  id: true,
  name: true,
  nameLower: true,
  parentId: true,
  createdAt: true,
} as const;

const FILE_SELECT = {
  id: true,
  name: true,
  nameLower: true,
  folderId: true,
  size: true,
  mimeType: true,
  createdAt: true,
} as const;

function keysetWhere(cursor: { n: string; i: string } | undefined) {
  if (!cursor) return {};
  return {
    OR: [
      { nameLower: { gt: cursor.n } },
      { nameLower: cursor.n, id: { gt: cursor.i } },
    ],
  };
}

function folderToItem(row: FolderRow): ContentItem {
  return {
    type: 'folder',
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    createdAt: row.createdAt,
  };
}

function fileToItem(row: FileRow): ContentItem {
  return {
    type: 'file',
    id: row.id,
    name: row.name,
    folderId: row.folderId,
    size: row.size,
    mimeType: row.mimeType,
    createdAt: row.createdAt,
  };
}

/**
 * Lists the direct children (subfolders + files) of a folder, or of a data
 * room's root when parentFolderId is null. Shared by the data-room root
 * listing and folder listing endpoints - same shape, same sort, same
 * keyset cursor.
 *
 * Folders sort before files; within each group, order is (nameLower, id)
 * ascending, matching the composite indexes on both tables so Postgres
 * never falls back to a full sort. The cursor tags which of the two
 * sources it belongs to, so a page can straddle the folder/file boundary
 * without losing or duplicating rows.
 */
export async function fetchContents(
  prisma: PrismaService,
  dataRoomId: string,
  parentFolderId: string | null,
  {
    cursor,
    limit = DEFAULT_LIMIT,
  }: { cursor?: ContentsCursor; limit?: number },
): Promise<Page<ContentItem>> {
  if (cursor?.t === 'file') {
    const fileRows = await prisma.file.findMany({
      where: {
        dataRoomId,
        folderId: parentFolderId,
        uploadedAt: { not: null },
        ...keysetWhere(cursor),
      },
      select: FILE_SELECT,
      orderBy: [{ nameLower: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    return finishWithFiles(fileRows, limit);
  }

  const folderCursor = cursor?.t === 'folder' ? cursor : undefined;
  const folderRows = await prisma.folder.findMany({
    where: {
      dataRoomId,
      parentId: parentFolderId,
      ...keysetWhere(folderCursor),
    },
    select: FOLDER_SELECT,
    orderBy: [{ nameLower: 'asc' }, { id: 'asc' }],
    take: limit + 1,
  });

  if (folderRows.length > limit) {
    const pageFolders = folderRows.slice(0, limit);
    const last = pageFolders[pageFolders.length - 1];
    return {
      items: pageFolders.map(folderToItem),
      nextCursor: encodeCursor({ t: 'folder', n: last.nameLower, i: last.id }),
    };
  }

  const remaining = limit - folderRows.length;
  if (remaining === 0) {
    const last = folderRows[folderRows.length - 1];
    return {
      items: folderRows.map(folderToItem),
      nextCursor: encodeCursor({ t: 'folder', n: last.nameLower, i: last.id }),
    };
  }

  const fileRows = await prisma.file.findMany({
    where: {
      dataRoomId,
      folderId: parentFolderId,
      uploadedAt: { not: null },
    },
    select: FILE_SELECT,
    orderBy: [{ nameLower: 'asc' }, { id: 'asc' }],
    take: remaining + 1,
  });

  const { items: fileItems, nextCursor } = finishWithFiles(fileRows, remaining);
  return {
    items: [...folderRows.map(folderToItem), ...fileItems],
    nextCursor,
  };
}

function finishWithFiles(
  fileRows: FileRow[],
  limit: number,
): Page<ContentItem> {
  if (fileRows.length > limit) {
    const pageFiles = fileRows.slice(0, limit);
    const last = pageFiles[pageFiles.length - 1];
    return {
      items: pageFiles.map(fileToItem),
      nextCursor: encodeCursor({ t: 'file', n: last.nameLower, i: last.id }),
    };
  }

  return { items: fileRows.map(fileToItem), nextCursor: null };
}
