import { randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Share, ShareResourceType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CoverageEntry,
  dataRoomScope,
  fileScope,
  folderScope,
  requireAccess,
} from '@/common/access';
import { decodeShareCursor, encodeCursor, Page } from '@/common/pagination';
import { parseCursor } from '@/common/parse-cursor';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { CreateShareDto } from './dto/create-share.dto';
import { ListSharesQueryDto } from './dto/list-shares-query.dto';

interface ResolvedResource {
  name: string;
  dataRoomId: string;
  chain: CoverageEntry[];
}

export interface ReceivedShare {
  shareId: string;
  resourceType: ShareResourceType;
  resourceId: string;
  resourceName: string;
  dataRoomId: string;
  sharedAt: Date;
}

@Injectable()
export class SharesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateShareDto): Promise<Share> {
    await this.resolveOwnedResource(userId, dto.resourceType, dto.resourceId);

    const existing = await this.prisma.share.findFirst({
      where: {
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        mode: dto.mode,
        revokedAt: null,
        ...(dto.mode === 'USER' ? { granteeEmail: dto.granteeEmail } : {}),
      },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.share.create({
      data: {
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        mode: dto.mode,
        granteeEmail: dto.mode === 'USER' ? dto.granteeEmail : null,
        token:
          dto.mode === 'PUBLIC_LINK'
            ? randomBytes(24).toString('base64url')
            : null,
        createdById: userId,
      },
    });
  }

  async list(
    userId: string,
    resourceType: ShareResourceType,
    resourceId: string,
    query: ListSharesQueryDto,
  ): Promise<Page<Share>> {
    await this.resolveOwnedResource(userId, resourceType, resourceId);

    const cursor = parseCursor(decodeShareCursor, query.cursor);
    const limit = query.limit;

    const where = {
      resourceType,
      resourceId,
      revokedAt: null,
      ...(query.mode ? { mode: query.mode } : {}),
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.c) } },
              { createdAt: new Date(cursor.c), id: { lt: cursor.i } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.share.findMany({
      where,
      // Newest first: a page cap means only the first page is visible by
      // default, and a freshly created share must land there, not get
      // buried behind older ones on a later page.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    if (rows.length > limit) {
      const items = rows.slice(0, limit);
      const last = items[items.length - 1];
      return {
        items,
        nextCursor: encodeCursor({
          t: 'share',
          c: last.createdAt.toISOString(),
          i: last.id,
        }),
      };
    }

    return { items: rows, nextCursor: null };
  }

  async revoke(userId: string, shareId: string): Promise<void> {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
    });
    if (!share) {
      throw new NotFoundException('Share not found');
    }
    await this.resolveOwnedResource(
      userId,
      share.resourceType,
      share.resourceId,
    );

    await this.prisma.share.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    });
  }

  async getReceived(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<Page<ReceivedShare>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      return { items: [], nextCursor: null };
    }

    const cursor = parseCursor(decodeShareCursor, query.cursor);
    const limit = query.limit;

    const where = {
      mode: 'USER' as const,
      granteeEmail: user.email,
      revokedAt: null,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.c) } },
              { createdAt: new Date(cursor.c), id: { lt: cursor.i } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.share.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const page = rows.slice(0, limit);
    // Cursor is built from the raw page (before dropping dangling shares
    // below) - otherwise a dangling share would eat a neighboring live one
    // at the page seam.
    const nextCursor =
      rows.length > limit
        ? encodeCursor({
            t: 'share',
            c: page[page.length - 1].createdAt.toISOString(),
            i: page[page.length - 1].id,
          })
        : null;

    const resources = await this.loadResourcesBatch(page);

    const items: ReceivedShare[] = [];
    for (const share of page) {
      const resource = resources.get(
        `${share.resourceType}:${share.resourceId}`,
      );
      // The share outlives the resource it points at - polymorphic
      // reference, no FK. A dangling share is silently dropped rather than
      // surfaced as a dead link.
      if (!resource) {
        continue;
      }
      items.push({
        shareId: share.id,
        resourceType: share.resourceType,
        resourceId: share.resourceId,
        resourceName: resource.name,
        dataRoomId: resource.dataRoomId,
        sharedAt: share.createdAt,
      });
    }
    return { items, nextCursor };
  }

  /** Only the owner of the underlying resource may manage shares on it. */
  private async resolveOwnedResource(
    userId: string,
    resourceType: ShareResourceType,
    resourceId: string,
  ): Promise<ResolvedResource> {
    const resource = await this.loadResource(resourceType, resourceId);
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }
    await requireAccess(
      this.prisma,
      { userId },
      resource.dataRoomId,
      resource.chain,
      'OWNER',
    );
    return resource;
  }

  private async loadResource(
    resourceType: ShareResourceType,
    resourceId: string,
  ): Promise<ResolvedResource | null> {
    if (resourceType === 'DATAROOM') {
      const dataRoom = await this.prisma.dataRoom.findUnique({
        where: { id: resourceId },
        select: { id: true, name: true },
      });
      if (!dataRoom) return null;
      const scope = dataRoomScope(dataRoom.id);
      return { name: dataRoom.name, ...scope };
    }

    if (resourceType === 'FOLDER') {
      const folder = await this.prisma.folder.findUnique({
        where: { id: resourceId },
      });
      if (!folder) return null;
      const scope = folderScope(folder);
      return { name: folder.name, ...scope };
    }

    const file = await this.prisma.file.findUnique({
      where: { id: resourceId },
    });
    if (!file) return null;
    const scope = await fileScope(this.prisma, file);
    return { name: file.name, ...scope };
  }

  /**
   * Batches resource lookups for a page of shares into at most three
   * findMany calls (one per resource type), instead of resolving each share
   * with its own query. No access chain is built here - getReceived isn't
   * an authorization check, only display data for already-matched shares.
   */
  private async loadResourcesBatch(
    shares: Share[],
  ): Promise<Map<string, { name: string; dataRoomId: string }>> {
    const idsByType: Record<ShareResourceType, string[]> = {
      DATAROOM: [],
      FOLDER: [],
      FILE: [],
    };
    for (const share of shares) {
      idsByType[share.resourceType].push(share.resourceId);
    }

    const [dataRooms, folders, files] = await Promise.all([
      idsByType.DATAROOM.length
        ? this.prisma.dataRoom.findMany({
            where: { id: { in: idsByType.DATAROOM } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      idsByType.FOLDER.length
        ? this.prisma.folder.findMany({
            where: { id: { in: idsByType.FOLDER } },
            select: { id: true, name: true, dataRoomId: true },
          })
        : Promise.resolve([]),
      idsByType.FILE.length
        ? this.prisma.file.findMany({
            where: { id: { in: idsByType.FILE } },
            select: { id: true, name: true, dataRoomId: true },
          })
        : Promise.resolve([]),
    ]);

    const map = new Map<string, { name: string; dataRoomId: string }>();
    for (const room of dataRooms) {
      map.set(`DATAROOM:${room.id}`, { name: room.name, dataRoomId: room.id });
    }
    for (const folder of folders) {
      map.set(`FOLDER:${folder.id}`, {
        name: folder.name,
        dataRoomId: folder.dataRoomId,
      });
    }
    for (const file of files) {
      map.set(`FILE:${file.id}`, {
        name: file.name,
        dataRoomId: file.dataRoomId,
      });
    }
    return map;
  }
}
