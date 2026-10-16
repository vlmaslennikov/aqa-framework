import { PrismaService } from '@/prisma/prisma.service';
import { decodeContentsCursor } from '@/common/pagination';
import { fetchContents } from '@/common/contents';

const createdAt = new Date('2024-01-01T00:00:00Z');

function folderRow(id: string, name: string) {
  return { id, name, nameLower: name.toLowerCase(), parentId: null, createdAt };
}

function fileRow(id: string, name: string) {
  return {
    id,
    name,
    nameLower: name.toLowerCase(),
    folderId: null,
    size: 100,
    mimeType: 'application/pdf',
    createdAt,
  };
}

interface FindManyArgs {
  where: object;
  take: number;
}

function fakePrisma() {
  const folderFindMany = jest.fn<Promise<unknown[]>, [FindManyArgs]>();
  const fileFindMany = jest.fn<Promise<unknown[]>, [FindManyArgs]>();
  const prisma = {
    folder: { findMany: folderFindMany },
    file: { findMany: fileFindMany },
  } as unknown as PrismaService;
  return { prisma, folderFindMany, fileFindMany };
}

function idsOf(items: { type: string; id: string }[]) {
  return items.map((i) => `${i.type}:${i.id}`);
}

describe('fetchContents - folder/file page boundary', () => {
  it('fills the page with folders alone when more folders exist than the limit, without querying files', async () => {
    const { prisma, folderFindMany, fileFindMany } = fakePrisma();
    const a = folderRow('f-a', 'Alpha');
    const b = folderRow('f-b', 'Bravo');
    const c = folderRow('f-c', 'Charlie');
    folderFindMany.mockResolvedValueOnce([a, b, c]); // take: limit + 1 = 3, all 3 exist

    const page = await fetchContents(prisma, 'room-1', null, { limit: 2 });

    expect(idsOf(page.items)).toEqual(['folder:f-a', 'folder:f-b']);
    expect(fileFindMany).not.toHaveBeenCalled();
    expect(page.nextCursor).not.toBeNull();
    expect(decodeContentsCursor(page.nextCursor!)).toEqual({
      t: 'folder',
      n: 'bravo',
      i: 'f-b',
    });
  });

  it('loses no item and duplicates none when the folder count lands exactly on the page boundary', async () => {
    const { prisma, folderFindMany, fileFindMany } = fakePrisma();
    const a = folderRow('f-a', 'Alpha');
    const b = folderRow('f-b', 'Bravo');
    const x = fileRow('x-1', 'invoice.pdf');
    const y = fileRow('y-1', 'summary.pdf');

    // page 1: probe (take limit+1=3) finds exactly 2 folders, i.e. no more folders exist
    folderFindMany.mockResolvedValueOnce([a, b]);

    const page1 = await fetchContents(prisma, 'room-1', null, { limit: 2 });

    expect(idsOf(page1.items)).toEqual(['folder:f-a', 'folder:f-b']);
    expect(fileFindMany).not.toHaveBeenCalled();
    expect(page1.nextCursor).not.toBeNull();

    // page 2: resuming the folder cursor finds no further folders, then tops up with files
    folderFindMany.mockResolvedValueOnce([]);
    fileFindMany.mockResolvedValueOnce([x, y]); // take remaining+1=3, only 2 exist

    const cursor2 = decodeContentsCursor(page1.nextCursor!);
    const page2 = await fetchContents(prisma, 'room-1', null, {
      limit: 2,
      cursor: cursor2,
    });

    expect(idsOf(page2.items)).toEqual(['file:x-1', 'file:y-1']);
    expect(page2.nextCursor).toBeNull();

    expect(fileFindMany.mock.calls[0][0].where).not.toHaveProperty('OR');

    const allIds = [...idsOf(page1.items), ...idsOf(page2.items)];
    expect(allIds).toEqual([
      'folder:f-a',
      'folder:f-b',
      'file:x-1',
      'file:y-1',
    ]);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('tops up with files in the same call when folders end before the limit, without duplicating the cursor row', async () => {
    const { prisma, folderFindMany, fileFindMany } = fakePrisma();
    const a = folderRow('f-a', 'Alpha');
    const b = folderRow('f-b', 'Bravo');
    const x = fileRow('x-1', 'a-invoice.pdf');
    const y = fileRow('y-1', 'b-summary.pdf');
    const z = fileRow('z-1', 'c-terms.pdf');

    // limit=3: folder probe (take 4) finds only 2 folders -> remaining=1, file top-up take=2
    folderFindMany.mockResolvedValueOnce([a, b]);
    fileFindMany.mockResolvedValueOnce([x, y]);

    const page1 = await fetchContents(prisma, 'room-1', null, { limit: 3 });

    expect(idsOf(page1.items)).toEqual([
      'folder:f-a',
      'folder:f-b',
      'file:x-1',
    ]);
    expect(page1.nextCursor).not.toBeNull();
    expect(decodeContentsCursor(page1.nextCursor!)).toEqual({
      t: 'file',
      n: 'a-invoice.pdf',
      i: 'x-1',
    });

    expect(fileFindMany.mock.calls[0][0].where).not.toHaveProperty('OR');
    expect(fileFindMany.mock.calls[0][0].take).toBe(2);

    // page 2: cursor is a file cursor, so folders are skipped entirely
    fileFindMany.mockResolvedValueOnce([y, z]);

    const cursor2 = decodeContentsCursor(page1.nextCursor!);
    const page2 = await fetchContents(prisma, 'room-1', null, {
      limit: 3,
      cursor: cursor2,
    });

    expect(folderFindMany).toHaveBeenCalledTimes(1);
    expect(idsOf(page2.items)).toEqual(['file:y-1', 'file:z-1']);
    expect(page2.nextCursor).toBeNull();

    const allIds = [...idsOf(page1.items), ...idsOf(page2.items)];
    expect(allIds).toEqual([
      'folder:f-a',
      'folder:f-b',
      'file:x-1',
      'file:y-1',
      'file:z-1',
    ]);
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
