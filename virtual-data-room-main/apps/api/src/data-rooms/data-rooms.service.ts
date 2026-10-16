import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AccessLevel,
  dataRoomScope,
  folderScope,
  getFolderOrThrow,
  requireAccess,
} from '@/common/access';
import { ContentItem, fetchContents } from '@/common/contents';
import {
  decodeContentsCursor,
  decodeDataRoomsCursor,
  decodeFolderCursor,
  encodeCursor,
  Page,
} from '@/common/pagination';
import { parseCursor } from '@/common/parse-cursor';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { CreateDataRoomDto } from './dto/create-data-room.dto';

export const DEFAULT_DATA_ROOM_NAME = 'My Data Room';

export interface DataRoomSummary {
  id: string;
  name: string;
  createdAt: Date;
}

export interface DataRoomDetail extends DataRoomSummary {
  accessLevel: AccessLevel;
}

export interface FolderNode {
  id: string;
  name: string;
  hasChildren: boolean;
}

@Injectable()
export class DataRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateDataRoomDto) {
    return this.prisma.dataRoom.create({
      data: { name: dto.name.trim(), ownerId: userId },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async findAllForUser(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<Page<DataRoomSummary>> {
    const cursor = parseCursor(decodeDataRoomsCursor, query.cursor);
    const limit = query.limit;

    const where = cursor
      ? {
          ownerId: userId,
          OR: [
            { createdAt: { gt: new Date(cursor.c) } },
            { createdAt: new Date(cursor.c), id: { gt: cursor.i } },
          ],
        }
      : { ownerId: userId };

    const rows = await this.prisma.dataRoom.findMany({
      where,
      select: { id: true, name: true, createdAt: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    if (rows.length > limit) {
      const items = rows.slice(0, limit);
      const last = items[items.length - 1];
      return {
        items,
        nextCursor: encodeCursor({
          t: 'dataRoom',
          c: last.createdAt.toISOString(),
          i: last.id,
        }),
      };
    }

    return { items: rows, nextCursor: null };
  }

  async findOne(userId: string, dataRoomId: string): Promise<DataRoomDetail> {
    const scope = dataRoomScope(dataRoomId);
    const accessLevel = await requireAccess(
      this.prisma,
      { userId },
      scope.dataRoomId,
      scope.chain,
      'VIEWER',
    );

    const dataRoom = await this.prisma.dataRoom.findUniqueOrThrow({
      where: { id: dataRoomId },
      select: { id: true, name: true, createdAt: true },
    });

    return { ...dataRoom, accessLevel };
  }

  async getContents(
    userId: string,
    dataRoomId: string,
    query: PaginationQueryDto,
  ): Promise<Page<ContentItem>> {
    const scope = dataRoomScope(dataRoomId);
    await requireAccess(
      this.prisma,
      { userId },
      scope.dataRoomId,
      scope.chain,
      'VIEWER',
    );
    const cursor = parseCursor(decodeContentsCursor, query.cursor);
    return fetchContents(this.prisma, dataRoomId, null, {
      cursor,
      limit: query.limit,
    });
  }

  async getFolders(
    userId: string,
    dataRoomId: string,
    parentId: string | null,
    query: PaginationQueryDto,
  ): Promise<Page<FolderNode>> {
    const scope = parentId
      ? folderScope(await getFolderOrThrow(this.prisma, parentId))
      : dataRoomScope(dataRoomId);
    if (scope.dataRoomId !== dataRoomId) {
      throw new NotFoundException('Folder not found');
    }
    await requireAccess(
      this.prisma,
      { userId },
      scope.dataRoomId,
      scope.chain,
      'VIEWER',
    );
    const cursor = parseCursor(decodeFolderCursor, query.cursor);
    const limit = query.limit;
    const where = cursor
      ? {
          dataRoomId,
          parentId,
          OR: [
            { nameLower: { gt: cursor.n } },
            { nameLower: cursor.n, id: { gt: cursor.i } },
          ],
        }
      : { dataRoomId, parentId };

    const rows = await this.prisma.folder.findMany({
      where,
      select: {
        id: true,
        name: true,
        nameLower: true,
        _count: { select: { children: true } },
      },
      orderBy: [{ nameLower: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    const page = rows.slice(0, limit);
    const items = page.map((row) => ({
      id: row.id,
      name: row.name,
      hasChildren: row._count.children > 0,
    }));

    if (rows.length <= limit) {
      return { items, nextCursor: null };
    }

    const last = page[page.length - 1];
    return {
      items,
      nextCursor: encodeCursor({ t: 'folder', n: last.nameLower, i: last.id }),
    };
  }
}
