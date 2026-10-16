import { BadRequestException } from '@nestjs/common';

/**
 * Single place where a raw cursor string turns into a typed cursor or a 400.
 * Keeps decode functions in pagination.ts free of Nest/HTTP concerns while
 * avoiding a try/catch at every call site.
 */
export function parseCursor<T>(
  decode: (raw: string) => T,
  raw: string | undefined,
): T | undefined {
  if (raw === undefined) {
    return undefined;
  }
  try {
    return decode(raw);
  } catch {
    throw new BadRequestException('Invalid pagination cursor');
  }
}
