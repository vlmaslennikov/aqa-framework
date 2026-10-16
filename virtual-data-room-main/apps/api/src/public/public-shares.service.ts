import { Injectable, NotFoundException } from '@nestjs/common';
import { Share } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import {
  CoverageEntry,
  assertPublicTokenActive,
  dataRoomScope,
  fileScope,
  folderScope,
  getFolderOrThrow,
  getUploadedFileOrThrow,
  requireAccess,
} from '@/common/access';
import { ContentItem, fetchContents } from '@/common/contents';
import { decodeContentsCursor, Page } from '@/common/pagination';
import { parseCursor } from '@/common/parse-cursor';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

interface ShareTarget {
  name: string;
  dataRoomId: string;
  chain: CoverageEntry[];
  size?: number;
  mimeType?: string;
}

export interface PublicShareSummary {
  resourceType: Share['resourceType'];
  resourceId: string;
  resourceName: string;
  dataRoomId: string;
  size?: number;
  mimeType?: string;
}

@Injectable()
export class PublicSharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getShare(token: string): Promise<PublicShareSummary> {
    await assertPublicTokenActive(this.prisma, token);
    const share = await this.getActiveLinkOrThrow(token);
    const target = await this.resolveShareTarget(share);
    await requireAccess(
      this.prisma,
      { token },
      target.dataRoomId,
      target.chain,
      'VIEWER',
    );

    return {
      resourceType: share.resourceType,
      resourceId: share.resourceId,
      resourceName: target.name,
      dataRoomId: target.dataRoomId,
      size: target.size,
      mimeType: target.mimeType,
    };
  }

  async getRootContents(
    token: string,
    query: PaginationQueryDto,
  ): Promise<Page<ContentItem>> {
    await assertPublicTokenActive(this.prisma, token);
    const share = await this.getActiveLinkOrThrow(token);
    const target = await this.resolveShareTarget(share);

    // The requested resource here is the room root, not the share's own
    // resource - a folder/file share never covers it, so this only ever
    // resolves for a DATAROOM-mode share (the id-substitution check still
    // runs, it just always rejects the other two cases).
    const rootScope = dataRoomScope(target.dataRoomId);
    await requireAccess(
      this.prisma,
      { token },
      rootScope.dataRoomId,
      rootScope.chain,
      'VIEWER',
    );

    const cursor = parseCursor(decodeContentsCursor, query.cursor);
    return fetchContents(this.prisma, target.dataRoomId, null, {
      cursor,
      limit: query.limit,
    });
  }

  async getFolderContents(
    token: string,
    folderId: string,
    query: PaginationQueryDto,
  ): Promise<Page<ContentItem>> {
    await assertPublicTokenActive(this.prisma, token);
    const folder = await getFolderOrThrow(this.prisma, folderId);
    const scope = folderScope(folder);
    await requireAccess(
      this.prisma,
      { token },
      scope.dataRoomId,
      scope.chain,
      'VIEWER',
    );

    const cursor = parseCursor(decodeContentsCursor, query.cursor);
    return fetchContents(this.prisma, folder.dataRoomId, folder.id, {
      cursor,
      limit: query.limit,
    });
  }

  async getFileViewUrl(
    token: string,
    fileId: string,
  ): Promise<{ url: string }> {
    await assertPublicTokenActive(this.prisma, token);
    const file = await getUploadedFileOrThrow(this.prisma, fileId);
    const scope = await fileScope(this.prisma, file);
    await requireAccess(
      this.prisma,
      { token },
      scope.dataRoomId,
      scope.chain,
      'VIEWER',
    );

    const url = await this.storage.createViewUrl(file.storageKey);
    return { url };
  }

  async getFileDownloadUrl(
    token: string,
    fileId: string,
  ): Promise<{ url: string }> {
    await assertPublicTokenActive(this.prisma, token);
    const file = await getUploadedFileOrThrow(this.prisma, fileId);
    const scope = await fileScope(this.prisma, file);
    await requireAccess(
      this.prisma,
      { token },
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

  async getFileSummary(
    token: string,
    fileId: string,
  ): Promise<{ id: string; name: string; size: number; mimeType: string }> {
    await assertPublicTokenActive(this.prisma, token);
    const file = await getUploadedFileOrThrow(this.prisma, fileId);
    const scope = await fileScope(this.prisma, file);
    await requireAccess(
      this.prisma,
      { token },
      scope.dataRoomId,
      scope.chain,
      'VIEWER',
    );

    return {
      id: file.id,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
    };
  }

  private async getActiveLinkOrThrow(token: string): Promise<Share> {
    const share = await this.prisma.share.findUnique({ where: { token } });
    if (!share || share.mode !== 'PUBLIC_LINK') {
      throw new NotFoundException('Link not found');
    }
    return share;
  }

  private async resolveShareTarget(share: Share): Promise<ShareTarget> {
    if (share.resourceType === 'DATAROOM') {
      const dataRoom = await this.prisma.dataRoom.findUnique({
        where: { id: share.resourceId },
        select: { id: true, name: true },
      });
      if (!dataRoom) {
        throw new NotFoundException('Resource not found');
      }
      const scope = dataRoomScope(dataRoom.id);
      return { name: dataRoom.name, ...scope };
    }

    if (share.resourceType === 'FOLDER') {
      const folder = await getFolderOrThrow(this.prisma, share.resourceId);
      const scope = folderScope(folder);
      return { name: folder.name, ...scope };
    }

    const file = await getUploadedFileOrThrow(this.prisma, share.resourceId);
    const scope = await fileScope(this.prisma, file);
    return {
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
      ...scope,
    };
  }
}
