/**
 * Single source of truth for the denormalized nameLower column - every
 * writer (folder create/rename, later file upload/rename/move) derives it
 * here so the case-insensitive sort order and resolveName conflict check
 * never drift from the display name.
 */
export function toNameLower(name: string): string {
  return name.toLowerCase();
}
