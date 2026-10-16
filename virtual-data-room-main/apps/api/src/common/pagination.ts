export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export type ContentsCursor = { t: 'folder' | 'file'; n: string; i: string };

export type FolderCursor = { t: 'folder'; n: string; i: string };

export interface DataRoomsCursor {
  t: 'dataRoom';
  c: string;
  i: string;
}

export type ShareCursor = { t: 'share'; c: string; i: string };

/**
 * Cursors are opaque to the client - base64url of a small JSON tag. Decoding
 * throws a plain Error on malformed input; callers turn that into a 400
 * (see common/parse-cursor.ts), this module stays free of Nest/HTTP concerns.
 */
export function encodeCursor(
  cursor: ContentsCursor | DataRoomsCursor | FolderCursor | ShareCursor,
): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeContentsCursor(raw: string): ContentsCursor {
  const cursor = decode(raw);
  if (
    (cursor.t !== 'folder' && cursor.t !== 'file') ||
    typeof cursor.n !== 'string' ||
    typeof cursor.i !== 'string'
  ) {
    throw new Error('Malformed cursor');
  }
  return cursor as ContentsCursor;
}

export function decodeFolderCursor(raw: string): FolderCursor {
  const cursor = decode(raw);
  if (
    cursor.t !== 'folder' ||
    typeof cursor.n !== 'string' ||
    typeof cursor.i !== 'string'
  ) {
    throw new Error('Malformed cursor');
  }
  return cursor as FolderCursor;
}

export function decodeDataRoomsCursor(raw: string): DataRoomsCursor {
  const cursor = decode(raw);
  if (
    cursor.t !== 'dataRoom' ||
    typeof cursor.c !== 'string' ||
    typeof cursor.i !== 'string' ||
    Number.isNaN(Date.parse(cursor.c))
  ) {
    throw new Error('Malformed cursor');
  }
  return cursor as unknown as DataRoomsCursor;
}

export function decodeShareCursor(raw: string): ShareCursor {
  const cursor = decode(raw);
  if (
    cursor.t !== 'share' ||
    typeof cursor.c !== 'string' ||
    typeof cursor.i !== 'string' ||
    Number.isNaN(Date.parse(cursor.c))
  ) {
    throw new Error('Malformed cursor');
  }
  return cursor as ShareCursor;
}

function decode(raw: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Malformed cursor');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Malformed cursor');
  }
  return parsed as Record<string, unknown>;
}
