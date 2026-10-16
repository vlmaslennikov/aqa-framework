import { PrismaService } from '@/prisma/prisma.service';
import { toNameLower } from '@/common/name-lower';

function splitExtension(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) {
    return { base: name, ext: '' };
  }
  return { base: name.slice(0, dot), ext: name.slice(dot) };
}

/**
 * Resolves a file name against sibling File rows in (dataRoomId, folderId),
 * appending " (1)", " (2)", ... before the extension until free. Folders
 * have a separate namespace and are not checked here. Conflict checks
 * include pending (uploadedAt: null) rows so a batch upload can't collide
 * with itself before any file in it completes.
 */
export async function resolveName(
  prisma: PrismaService,
  scope: { dataRoomId: string; folderId: string | null },
  name: string,
  excludeFileId?: string,
): Promise<string> {
  const { base, ext } = splitExtension(name);

  let candidate = name;
  let attempt = 0;
  for (;;) {
    const conflict = await prisma.file.findFirst({
      where: {
        dataRoomId: scope.dataRoomId,
        folderId: scope.folderId,
        nameLower: toNameLower(candidate),
        ...(excludeFileId ? { id: { not: excludeFileId } } : {}),
      },
      select: { id: true },
    });
    if (!conflict) {
      return candidate;
    }
    attempt += 1;
    candidate = `${base} (${attempt})${ext}`;
  }
}
