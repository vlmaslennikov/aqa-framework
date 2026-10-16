import { PrismaService } from '@/prisma/prisma.service';
import { dataRoomScope, folderScope, fileScope } from './resource-scope';

describe('dataRoomScope', () => {
  it('produces a single-entry chain for the data room itself', () => {
    expect(dataRoomScope('room-1')).toEqual({
      dataRoomId: 'room-1',
      chain: [{ type: 'DATAROOM', id: 'room-1' }],
    });
  });
});

describe('folderScope', () => {
  it('turns a materialized path into a chain ending with the folder itself, in root-to-leaf order', () => {
    const scope = folderScope({ dataRoomId: 'room-1', path: 'a/b/c/' });
    expect(scope).toEqual({
      dataRoomId: 'room-1',
      chain: [
        { type: 'DATAROOM', id: 'room-1' },
        { type: 'FOLDER', id: 'a' },
        { type: 'FOLDER', id: 'b' },
        { type: 'FOLDER', id: 'c' },
      ],
    });
  });
});

describe('fileScope', () => {
  it('appends the folder path ancestors then the file itself, for a file inside a folder', async () => {
    const findUnique = jest.fn().mockResolvedValue({ path: 'a/b/' });
    const prisma = {
      folder: { findUnique },
    } as unknown as PrismaService;

    const scope = await fileScope(prisma, {
      id: 'file-1',
      dataRoomId: 'room-1',
      folderId: 'b',
    });

    expect(scope).toEqual({
      dataRoomId: 'room-1',
      chain: [
        { type: 'DATAROOM', id: 'room-1' },
        { type: 'FOLDER', id: 'a' },
        { type: 'FOLDER', id: 'b' },
        { type: 'FILE', id: 'file-1' },
      ],
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'b' },
      select: { path: true },
    });
  });

  it('produces [DATAROOM, FILE] without touching the folder table for a file in the data room root', async () => {
    const findUnique = jest.fn();
    const prisma = {
      folder: { findUnique },
    } as unknown as PrismaService;

    const scope = await fileScope(prisma, {
      id: 'file-1',
      dataRoomId: 'room-1',
      folderId: null,
    });

    expect(scope).toEqual({
      dataRoomId: 'room-1',
      chain: [
        { type: 'DATAROOM', id: 'room-1' },
        { type: 'FILE', id: 'file-1' },
      ],
    });
    expect(findUnique).not.toHaveBeenCalled();
  });
});
