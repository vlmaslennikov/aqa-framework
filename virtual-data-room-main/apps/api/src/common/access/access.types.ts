import { ShareResourceType } from '@prisma/client';

export type AccessLevel = 'OWNER' | 'VIEWER' | 'NONE';

/**
 * One entry in a resource's self-plus-ancestors set (data room, every
 * folder up the materialized path, then the resource itself). A Share on
 * any entry grants VIEWER on the resource - this is the single definition
 * of "inheritance" the whole access model relies on.
 */
export interface CoverageEntry {
  type: ShareResourceType;
  id: string;
}

export type Actor = { userId: string } | { token: string };

const ACCESS_RANK: Record<AccessLevel, number> = {
  NONE: 0,
  VIEWER: 1,
  OWNER: 2,
};

export function meetsAccessLevel(
  actual: AccessLevel,
  required: AccessLevel,
): boolean {
  return ACCESS_RANK[actual] >= ACCESS_RANK[required];
}
