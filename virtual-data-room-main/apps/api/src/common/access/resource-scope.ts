import { NotFoundException } from '@nestjs/common';
import { Folder, File as FileRow } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CoverageEntry } from './access.types';

export interface ResourceScope {
  dataRoomId: string;
  chain: CoverageEntry[];
}

/**
 * Builds a coverage chain from a data room id and an optional folder path
 * (materialized as `id1/id2/.../selfId/`). This is the one place that turns
 * a path into a chain - both authorized services and the public routes call
 * it, so folder/file inheritance can't drift between the two.
 */
function chainFromPath(
  dataRoomId: string,
  path: string | null,
  self?: CoverageEntry,
): CoverageEntry[] {
  const chain: CoverageEntry[] = [{ type: 'DATAROOM', id: dataRoomId }];
  if (path) {
    for (const id of path.split('/').filter(Boolean)) {
      chain.push({ type: 'FOLDER', id });
    }
  }
  if (self) {
    chain.push(self);
  }
  return chain;
}

export function dataRoomScope(dataRoomId: string): ResourceScope {
  return { dataRoomId, chain: chainFromPath(dataRoomId, null) };
}

export function folderScope(
  folder: Pick<Folder, 'dataRoomId' | 'path'>,
): ResourceScope {
  // folder.path already ends with the folder's own id, so it is its own
  // coverage entry - no separate `self` needed.
  return {
    dataRoomId: folder.dataRoomId,
    chain: chainFromPath(folder.dataRoomId, folder.path),
  };
}

export async function fileScope(
  prisma: PrismaService,
  file: Pick<FileRow, 'id' | 'dataRoomId' | 'folderId'>,
): Promise<ResourceScope> {
  let folderPath: string | null = null;
  if (file.folderId) {
    const folder = await prisma.folder.findUnique({
      where: { id: file.folderId },
      select: { path: true },
    });
    folderPath = folder?.path ?? null;
  }
  return {
    dataRoomId: file.dataRoomId,
    chain: chainFromPath(file.dataRoomId, folderPath, {
      type: 'FILE',
      id: file.id,
    }),
  };
}

export async function getFolderOrThrow(
  prisma: PrismaService,
  folderId: string,
): Promise<Folder> {
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) {
    throw new NotFoundException('Folder not found');
  }
  return folder;
}

export async function getFileOrThrow(
  prisma: PrismaService,
  fileId: string,
): Promise<FileRow> {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) {
    throw new NotFoundException('File not found');
  }
  return file;
}

/**
 * Same as `getFileOrThrow`, but excludes rows whose upload never completed
 * (`uploadedAt: null`) - the bucket object may not exist yet, so read paths
 * must not surface these even though mutations still need to touch them.
 */
export async function getUploadedFileOrThrow(
  prisma: PrismaService,
  fileId: string,
): Promise<FileRow> {
  const file = await prisma.file.findFirst({
    where: { id: fileId, uploadedAt: { not: null } },
  });
  if (!file) {
    throw new NotFoundException('File not found');
  }
  return file;
}
