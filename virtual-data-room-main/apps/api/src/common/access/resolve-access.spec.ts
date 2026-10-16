import { GoneException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  resolveAccess,
  requireAccess,
  assertPublicTokenActive,
} from './resolve-access';
import { dataRoomScope } from './resource-scope';
import { CoverageEntry } from './access.types';

function fakePrisma(
  ownerId: string | null,
  overrides: {
    userFindUnique?: jest.Mock;
    shareFindFirst?: jest.Mock;
    shareFindUnique?: jest.Mock;
  } = {},
): PrismaService {
  return {
    dataRoom: {
      findUnique: jest
        .fn()
        .mockResolvedValue(ownerId === null ? null : { ownerId }),
    },
    user: {
      findUnique: overrides.userFindUnique ?? jest.fn().mockResolvedValue(null),
    },
    share: {
      findFirst: overrides.shareFindFirst ?? jest.fn(),
      findUnique: overrides.shareFindUnique ?? jest.fn(),
    },
  } as unknown as PrismaService;
}

const scope = dataRoomScope('room-1');
const GRANTEE_EMAIL = 'viewer@example.com';

describe('resolveAccess', () => {
  it('grants OWNER when the caller owns the data room', async () => {
    const prisma = fakePrisma('owner-1');
    await expect(
      resolveAccess(
        prisma,
        { userId: 'owner-1' },
        scope.dataRoomId,
        scope.chain,
      ),
    ).resolves.toBe('OWNER');
  });

  it('grants NONE to a different, real user who is not the owner and has no share', async () => {
    const prisma = fakePrisma('owner-1');
    await expect(
      resolveAccess(
        prisma,
        { userId: 'stranger-2' },
        scope.dataRoomId,
        scope.chain,
      ),
    ).resolves.toBe('NONE');
  });

  it('grants NONE when the data room does not exist', async () => {
    const prisma = fakePrisma(null);
    await expect(
      resolveAccess(prisma, { userId: 'owner-1' }, 'missing-room', scope.chain),
    ).resolves.toBe('NONE');
  });

  it('resolves OWNER before ever consulting Share, even if a revoked/foreign share exists on the same resource', async () => {
    const shareFindFirst = jest
      .fn()
      .mockRejectedValue(new Error('should never be queried for the owner'));
    const prisma = fakePrisma('owner-1', { shareFindFirst });

    await expect(
      resolveAccess(
        prisma,
        { userId: 'owner-1' },
        scope.dataRoomId,
        scope.chain,
      ),
    ).resolves.toBe('OWNER');
  });

  it('grants VIEWER via a direct share on the resource itself', async () => {
    const userFindUnique = jest
      .fn()
      .mockResolvedValue({ email: GRANTEE_EMAIL });
    const shareFindFirst = jest.fn().mockResolvedValue({ id: 'share-1' });
    const prisma = fakePrisma('owner-1', { userFindUnique, shareFindFirst });

    await expect(
      resolveAccess(
        prisma,
        { userId: 'viewer-1' },
        scope.dataRoomId,
        scope.chain,
      ),
    ).resolves.toBe('VIEWER');

    const [queryArgs] = shareFindFirst.mock.calls[0] as [
      {
        where: {
          revokedAt: null;
          mode: string;
          granteeEmail: string;
          OR: unknown[];
        };
      },
    ];
    expect(queryArgs.where.revokedAt).toBeNull();
    expect(queryArgs.where.mode).toBe('USER');
    expect(queryArgs.where.granteeEmail).toBe(GRANTEE_EMAIL);
    expect(queryArgs.where.OR).toEqual(
      scope.chain.map((entry) => ({
        resourceType: entry.type,
        resourceId: entry.id,
      })),
    );
  });

  it('grants VIEWER via a share on an ancestor folder, inherited down the materialized path', async () => {
    const userFindUnique = jest
      .fn()
      .mockResolvedValue({ email: GRANTEE_EMAIL });
    // the deep file/folder is not shared directly - only its ancestor folder is,
    // and Prisma's OR across the whole chain is what makes the match succeed.
    const chain: CoverageEntry[] = [
      { type: 'DATAROOM', id: 'room-1' },
      { type: 'FOLDER', id: 'ancestor-folder' },
      { type: 'FOLDER', id: 'deep-folder' },
      { type: 'FILE', id: 'deep-file' },
    ];
    const shareFindFirst = jest.fn(
      ({
        where,
      }: {
        where: { OR: { resourceType: string; resourceId: string }[] };
      }) => {
        const matches = where.OR.some(
          (o) =>
            o.resourceType === 'FOLDER' && o.resourceId === 'ancestor-folder',
        );
        return Promise.resolve(matches ? { id: 'share-ancestor' } : null);
      },
    );
    const prisma = fakePrisma('owner-1', { userFindUnique, shareFindFirst });

    await expect(
      resolveAccess(prisma, { userId: 'viewer-1' }, 'room-1', chain),
    ).resolves.toBe('VIEWER');
  });

  it('grants NONE for a revoked share even when email and resourceId otherwise match', async () => {
    const userFindUnique = jest
      .fn()
      .mockResolvedValue({ email: GRANTEE_EMAIL });
    // A real Prisma query filters revokedAt: null in `where`, so a revoked
    // share is never returned - simulate that by resolving null, not by
    // handing back a share object with revokedAt set.
    const shareFindFirst = jest.fn().mockResolvedValue(null);
    const prisma = fakePrisma('owner-1', { userFindUnique, shareFindFirst });

    await expect(
      resolveAccess(
        prisma,
        { userId: 'viewer-1' },
        scope.dataRoomId,
        scope.chain,
      ),
    ).resolves.toBe('NONE');
  });

  it('grants NONE to a real user with no share on any entry of the chain (foreign resource)', async () => {
    const userFindUnique = jest
      .fn()
      .mockResolvedValue({ email: GRANTEE_EMAIL });
    const shareFindFirst = jest.fn().mockResolvedValue(null);
    const prisma = fakePrisma('owner-1', { userFindUnique, shareFindFirst });

    await expect(
      resolveAccess(
        prisma,
        { userId: 'viewer-1' },
        scope.dataRoomId,
        scope.chain,
      ),
    ).resolves.toBe('NONE');
  });
});

describe('resolveAccess - public token scoping', () => {
  function fakeTokenPrisma(
    share: {
      mode: 'PUBLIC_LINK' | 'USER';
      revokedAt: Date | null;
      resourceType: 'DATAROOM' | 'FOLDER' | 'FILE';
      resourceId: string;
    } | null,
  ): PrismaService {
    return {
      share: { findUnique: jest.fn().mockResolvedValue(share) },
    } as unknown as PrismaService;
  }

  const sharedFolderId = 'folder-A';

  it('grants NONE when the requested chain does not include the shared resource (id substitution across an unrelated subtree)', async () => {
    const prisma = fakeTokenPrisma({
      mode: 'PUBLIC_LINK',
      revokedAt: null,
      resourceType: 'FOLDER',
      resourceId: sharedFolderId,
    });
    const foreignChain: CoverageEntry[] = [
      { type: 'DATAROOM', id: 'room-1' },
      { type: 'FOLDER', id: 'folder-B' },
    ];

    await expect(
      resolveAccess(prisma, { token: 'tok' }, 'room-1', foreignChain),
    ).resolves.toBe('NONE');
  });

  it('grants VIEWER when the requested chain includes the shared resource (resource inside the shared subtree)', async () => {
    const prisma = fakeTokenPrisma({
      mode: 'PUBLIC_LINK',
      revokedAt: null,
      resourceType: 'FOLDER',
      resourceId: sharedFolderId,
    });
    const coveredChain: CoverageEntry[] = [
      { type: 'DATAROOM', id: 'room-1' },
      { type: 'FOLDER', id: sharedFolderId },
      { type: 'FILE', id: 'nested-file' },
    ];

    await expect(
      resolveAccess(prisma, { token: 'tok' }, 'room-1', coveredChain),
    ).resolves.toBe('VIEWER');
  });

  it('grants NONE for a revoked public token even if the chain covers the shared resource', async () => {
    const prisma = fakeTokenPrisma({
      mode: 'PUBLIC_LINK',
      revokedAt: new Date(),
      resourceType: 'FOLDER',
      resourceId: sharedFolderId,
    });
    const coveredChain: CoverageEntry[] = [
      { type: 'DATAROOM', id: 'room-1' },
      { type: 'FOLDER', id: sharedFolderId },
    ];

    await expect(
      resolveAccess(prisma, { token: 'tok' }, 'room-1', coveredChain),
    ).resolves.toBe('NONE');
  });

  it('grants NONE for an unknown token', async () => {
    const prisma = fakeTokenPrisma(null);
    await expect(
      resolveAccess(prisma, { token: 'unknown' }, 'room-1', scope.chain),
    ).resolves.toBe('NONE');
  });
});

describe('assertPublicTokenActive', () => {
  function fakeTokenPrisma(
    share: {
      mode: 'PUBLIC_LINK' | 'USER';
      revokedAt: Date | null;
    } | null,
  ): PrismaService {
    return {
      share: { findUnique: jest.fn().mockResolvedValue(share) },
    } as unknown as PrismaService;
  }

  it('throws GoneException for a revoked PUBLIC_LINK share', async () => {
    const prisma = fakeTokenPrisma({
      mode: 'PUBLIC_LINK',
      revokedAt: new Date(),
    });
    await expect(assertPublicTokenActive(prisma, 'tok')).rejects.toBeInstanceOf(
      GoneException,
    );
  });

  it('does not throw for an active (non-revoked) PUBLIC_LINK share', async () => {
    const prisma = fakeTokenPrisma({ mode: 'PUBLIC_LINK', revokedAt: null });
    await expect(
      assertPublicTokenActive(prisma, 'tok'),
    ).resolves.toBeUndefined();
  });

  it('does not throw for an unknown token (stays a plain 404 downstream, not a false "revoked")', async () => {
    const prisma = fakeTokenPrisma(null);
    await expect(
      assertPublicTokenActive(prisma, 'unknown'),
    ).resolves.toBeUndefined();
  });
});

describe('requireAccess', () => {
  it('throws NotFoundException (404) for NONE against OWNER requirement', async () => {
    const prisma = fakePrisma('owner-1');
    await expect(
      requireAccess(
        prisma,
        { userId: 'stranger-2' },
        scope.dataRoomId,
        scope.chain,
        'OWNER',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException (404) for NONE against VIEWER requirement', async () => {
    const prisma = fakePrisma('owner-1');
    await expect(
      requireAccess(
        prisma,
        { userId: 'stranger-2' },
        scope.dataRoomId,
        scope.chain,
        'VIEWER',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not throw for OWNER against OWNER requirement', async () => {
    const prisma = fakePrisma('owner-1');
    await expect(
      requireAccess(
        prisma,
        { userId: 'owner-1' },
        scope.dataRoomId,
        scope.chain,
        'OWNER',
      ),
    ).resolves.toBe('OWNER');
  });

  it('does not throw for OWNER against VIEWER requirement', async () => {
    const prisma = fakePrisma('owner-1');
    await expect(
      requireAccess(
        prisma,
        { userId: 'owner-1' },
        scope.dataRoomId,
        scope.chain,
        'VIEWER',
      ),
    ).resolves.toBe('OWNER');
  });

  it('throws NotFoundException (404) for a VIEWER (share) against an OWNER requirement - a viewer cannot mutate', async () => {
    const userFindUnique = jest
      .fn()
      .mockResolvedValue({ email: GRANTEE_EMAIL });
    const shareFindFirst = jest.fn().mockResolvedValue({ id: 'share-1' });
    const prisma = fakePrisma('owner-1', { userFindUnique, shareFindFirst });

    await expect(
      requireAccess(
        prisma,
        { userId: 'viewer-1' },
        scope.dataRoomId,
        scope.chain,
        'OWNER',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
