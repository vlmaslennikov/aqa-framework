import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import {
  dataRoomScope,
  fileScope,
  getFileOrThrow,
  getUploadedFileOrThrow,
  requireAccess,
} from '@/common/access';
import { resolveName } from '@/common/resolve-name';
import { toNameLower } from '@/common/name-lower';
import { UploadIntentDto } from './dto/upload-intent.dto';
import { RenameFileDto } from './dto/rename-file.dto';
import { MoveFileDto } from './dto/move-file.dto';

export interface FileDetail {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  folderId: string | null;
  dataRoomId: string;
}

const FILE_SELECT = {
  id: true,
  name: true,
  folderId: true,
  dataRoomId: true,
  size: true,
  mimeType: true,
  uploadedAt: true,
  createdAt: true,
} as const;

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async createUploadIntent(userId: string, dto: UploadIntentDto) {
    const roomScope = dataRoomScope(dto.dataRoomId);
    await requireAccess(
      this.prisma,
      { userId },
      roomScope.dataRoomId,
      roomScope.chain,
      'OWNER',
    );

    let folderId: string | null = null;
    if (dto.folderId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: dto.folderId },
        select: { dataRoomId: true },
      });
      if (!folder || folder.dataRoomId !== dto.dataRoomId) {
        throw new NotFoundException('Folder not found');
      }
      folderId = dto.folderId;
    }

    const name = await resolveName(
      this.prisma,
      { dataRoomId: dto.dataRoomId, folderId },
      dto.name,
    );

    const id = randomUUID();
    const storageKey = randomUUID();

    await this.prisma.file.create({
      data: {
        id,
        name,
        nameLower: toNameLower(name),
        dataRoomId: dto.dataRoomId,
        folderId,
        size: dto.size,
        mimeType: dto.mimeType,
        storageKey,
        uploadedAt: null,
      },
    });

    const uploadUrl = await this.storage.createUploadUrl(storageKey);

    return { fileId: id, name, uploadUrl };
  }

  async completeUpload(userId: string, fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, dataRoomId: true, storageKey: true },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    const completeScope = dataRoomScope(file.dataRoomId);
    await requireAccess(
      this.prisma,
      { userId },
      completeScope.dataRoomId,
      completeScope.chain,
      'OWNER',
    );

    const info = await this.storage.getObjectInfo(file.storageKey);
    if (!info) {
      throw new BadRequestException('Upload did not finish - please try again');
    }

    return this.prisma.file.update({
      where: { id: fileId },
      data: { uploadedAt: new Date(), size: info.size },
      select: { id: true, name: true, folderId: true },
    });
  }

  async rename(userId: string, fileId: string, dto: RenameFileDto) {
    const file = await getFileOrThrow(this.prisma, fileId);
    const renameScope = dataRoomScope(file.dataRoomId);
    await requireAccess(
      this.prisma,
      { userId },
      renameScope.dataRoomId,
      renameScope.chain,
      'OWNER',
    );

    const name = await resolveName(
      this.prisma,
      { dataRoomId: file.dataRoomId, folderId: file.folderId },
      dto.name,
      file.id,
    );

    return this.prisma.file.update({
      where: { id: file.id },
      data: { name, nameLower: toNameLower(name) },
      select: FILE_SELECT,
    });
  }

  async move(userId: string, fileId: string, dto: MoveFileDto) {
    const file = await getFileOrThrow(this.prisma, fileId);
    const moveScope = dataRoomScope(file.dataRoomId);
    await requireAccess(
      this.prisma,
      { userId },
      moveScope.dataRoomId,
      moveScope.chain,
      'OWNER',
    );

    const targetFolderId = dto.targetFolderId ?? null;
    if (targetFolderId !== null) {
      const targetFolder = await this.prisma.folder.findUnique({
        where: { id: targetFolderId },
        select: { dataRoomId: true },
      });
      if (!targetFolder || targetFolder.dataRoomId !== file.dataRoomId) {
        throw new NotFoundException('Folder not found');
      }
    }

    const name = await resolveName(
      this.prisma,
      { dataRoomId: file.dataRoomId, folderId: targetFolderId },
      file.name,
      file.id,
    );

    return this.prisma.file.update({
      where: { id: file.id },
      data: { folderId: targetFolderId, name, nameLower: toNameLower(name) },
      select: FILE_SELECT,
    });
  }

  async remove(userId: string, fileId: string): Promise<void> {
    const file = await getFileOrThrow(this.prisma, fileId);
    const removeScope = dataRoomScope(file.dataRoomId);
    await requireAccess(
      this.prisma,
      { userId },
      removeScope.dataRoomId,
      removeScope.chain,
      'OWNER',
    );

    await this.prisma.file.delete({ where: { id: file.id } });
    // Row is already gone; an orphaned bucket object on storage failure is
    // an accepted trade-off, not a reason to 500.
    await this.storage.removeObject(file.storageKey).catch(() => undefined);
  }

  async getDownloadUrl(
    userId: string,
    fileId: string,
  ): Promise<{ url: string }> {
    const file = await getUploadedFileOrThrow(this.prisma, fileId);
    const scope = await fileScope(this.prisma, file);
    await requireAccess(
      this.prisma,
      { userId },
      scope.dataRoomId,
      scope.chain,
      'VIEWER',
    );

    const url = await this.storage.createDownloadUrl(
      file.storageKey,
      file.name,
    );
    return { url };
  }

  async getFile(userId: string, fileId: string): Promise<FileDetail> {
    const file = await getUploadedFileOrThrow(this.prisma, fileId);
    const scope = await fileScope(this.prisma, file);
    await requireAccess(
      this.prisma,
      { userId },
      scope.dataRoomId,
      scope.chain,
      'VIEWER',
    );

    return {
      id: file.id,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
      folderId: file.folderId,
      dataRoomId: file.dataRoomId,
    };
  }

  async getViewUrl(userId: string, fileId: string): Promise<{ url: string }> {
    const file = await getUploadedFileOrThrow(this.prisma, fileId);
    const scope = await fileScope(this.prisma, file);
    await requireAccess(
      this.prisma,
      { userId },
      scope.dataRoomId,
      scope.chain,
      'VIEWER',
    );

    const url = await this.storage.createViewUrl(file.storageKey);
    return { url };
  }
}
