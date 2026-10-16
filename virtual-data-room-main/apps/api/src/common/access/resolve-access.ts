import { GoneException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  Actor,
  AccessLevel,
  CoverageEntry,
  meetsAccessLevel,
} from './access.types';

/**
 * Determines what the actor can do with a resource. `chain` is the
 * resource's own coverage set (itself plus every ancestor up to the data
 * room - see `resource-scope.ts`); an unrevoked Share on any entry in it
 * grants VIEWER, which is how folder/room shares inherit down the
 * materialized path to their contents.
 */
export async function resolveAccess(
  prisma: PrismaService,
  actor: Actor,
  dataRoomId: string,
  chain: CoverageEntry[],
): Promise<AccessLevel> {
  if ('userId' in actor) {
    const dataRoom = await prisma.dataRoom.findUnique({
      where: { id: dataRoomId },
      select: { ownerId: true },
    });
    if (!dataRoom) {
      return 'NONE';
    }
    if (dataRoom.ownerId === actor.userId) {
      return 'OWNER';
    }

    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { email: true },
    });
    if (!user) {
      return 'NONE';
    }

    const share = await prisma.share.findFirst({
      where: {
        revokedAt: null,
        mode: 'USER',
        granteeEmail: user.email,
        OR: chain.map((entry) => ({
          resourceType: entry.type,
          resourceId: entry.id,
        })),
      },
      select: { id: true },
    });
    return share ? 'VIEWER' : 'NONE';
  }

  const share = await prisma.share.findUnique({
    where: { token: actor.token },
    select: {
      mode: true,
      revokedAt: true,
      resourceType: true,
      resourceId: true,
    },
  });
  if (!share || share.mode !== 'PUBLIC_LINK' || share.revokedAt) {
    return 'NONE';
  }

  const covered = chain.some(
    (entry) =>
      entry.type === share.resourceType && entry.id === share.resourceId,
  );
  return covered ? 'VIEWER' : 'NONE';
}

/**
 * Resolves access and enforces a minimum level. Unauthorized access throws
 * 404, not 403 - the API never confirms that a resource exists to a caller
 * who cannot see it. This is also what rejects id-substitution attempts: a
 * public token whose share doesn't cover the requested resource's chain
 * resolves to NONE here exactly like a resource that doesn't exist.
 */
export async function requireAccess(
  prisma: PrismaService,
  actor: Actor,
  dataRoomId: string,
  chain: CoverageEntry[],
  required: AccessLevel,
): Promise<AccessLevel> {
  const level = await resolveAccess(prisma, actor, dataRoomId, chain);
  if (!meetsAccessLevel(level, required)) {
    throw new NotFoundException('Resource not found');
  }
  return level;
}

/**
 * Finds the topmost (closest to the data room) chain entry an authenticated
 * actor's active USER share actually covers. Used only to trim ancestor
 * listings (breadcrumbs) to what a VIEWER is allowed to see - callers must
 * already know the actor is a non-owner VIEWER (e.g. via `requireAccess`)
 * before consulting this; it grants nothing by itself. Returns null when no
 * share matches (defensive - e.g. a share revoked between two requests),
 * which callers should treat as "only the resource itself is visible".
 */
export async function resolveShareBoundary(
  prisma: PrismaService,
  userId: string,
  chain: CoverageEntry[],
): Promise<CoverageEntry | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) {
    return null;
  }

  const matches = await prisma.share.findMany({
    where: {
      revokedAt: null,
      mode: 'USER',
      granteeEmail: user.email,
      OR: chain.map((entry) => ({
        resourceType: entry.type,
        resourceId: entry.id,
      })),
    },
    select: { resourceType: true, resourceId: true },
  });
  const matched = new Set(
    matches.map((m) => `${m.resourceType}:${m.resourceId}`),
  );
  return (
    chain.find((entry) => matched.has(`${entry.type}:${entry.id}`)) ?? null
  );
}

/**
 * Public-link-only pre-check that distinguishes a revoked link (410, so the
 * UI can show "access revoked" instead of a bare 404) from a missing token
 * or an out-of-subtree resource (404, kept opaque by requireAccess above).
 * Never grants access by itself - every public route still calls
 * requireAccess with the token actor for the actual decision, so a bug here
 * can only turn a NONE into a friendlier NONE, never into access.
 */
export async function assertPublicTokenActive(
  prisma: PrismaService,
  token: string,
): Promise<void> {
  const share = await prisma.share.findUnique({
    where: { token },
    select: { mode: true, revokedAt: true },
  });
  if (share?.mode === 'PUBLIC_LINK' && share.revokedAt) {
    throw new GoneException('This link has been revoked');
  }
}
