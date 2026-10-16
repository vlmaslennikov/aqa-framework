import { PrismaService } from '@/prisma/prisma.service';
import { resolveName } from './resolve-name';

function fakePrisma(findFirst: jest.Mock): PrismaService {
  return {
    file: { findFirst },
  } as unknown as PrismaService;
}

const scope = { dataRoomId: 'room-1', folderId: 'folder-1' };

describe('resolveName', () => {
  it('returns the name unchanged when no sibling conflicts', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = fakePrisma(findFirst);

    await expect(resolveName(prisma, scope, 'report.pdf')).resolves.toBe(
      'report.pdf',
    );
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it('appends " (1)" before the extension on a single conflict', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({ id: 'existing' })
      .mockResolvedValueOnce(null);
    const prisma = fakePrisma(findFirst);

    await expect(resolveName(prisma, scope, 'report.pdf')).resolves.toBe(
      'report (1).pdf',
    );
  });

  it('increments to " (2)" when "(1)" also conflicts', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({ id: 'existing' })
      .mockResolvedValueOnce({ id: 'existing-1' })
      .mockResolvedValueOnce(null);
    const prisma = fakePrisma(findFirst);

    await expect(resolveName(prisma, scope, 'report.pdf')).resolves.toBe(
      'report (2).pdf',
    );
  });

  it('checks conflicts case-insensitively via nameLower, not the raw name', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = fakePrisma(findFirst);

    await resolveName(prisma, scope, 'Report.PDF');

    const [{ where }] = findFirst.mock.calls[0] as [
      { where: { nameLower: string } },
    ];
    expect(where.nameLower).toBe('report.pdf');
  });

  it('is a no-op when moving a file into the same folder it already occupies', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = fakePrisma(findFirst);

    await expect(
      resolveName(prisma, scope, 'report.pdf', 'self-id'),
    ).resolves.toBe('report.pdf');

    const [{ where }] = findFirst.mock.calls[0] as [
      { where: { id: { not: string } } },
    ];
    expect(where.id).toEqual({ not: 'self-id' });
  });
});
