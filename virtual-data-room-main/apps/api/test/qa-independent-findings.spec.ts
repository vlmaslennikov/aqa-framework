/**
 * Investigation-only reproducers of observed unsafe behavior in real VDR code.
 * Passing means FINDING REPRODUCED, not a passed product requirement.
 * Does not connect to DB or Storage; the primary boundary probe JSON and
 * follow-up isolated PostgreSQL/Storage cases should be kept distinct.
 */
import { FilesService } from '../src/files/files.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';

jest.mock('@/common/access', () => ({
  ...jest.requireActual('@/common/access'),
  requireAccess: jest.fn(async () => undefined),
}));

describe('QA investigation: new source-level findings (not acceptance passes)', () => {
  it('QA-NEW-01: signing failure occurs after pending metadata creation without compensation', async () => {
    const insert = jest.fn().mockResolvedValue({ id: 'qa-created-file' });
    const remove = jest.fn();
    const prisma = {
      file: {findFirst: jest.fn().mockResolvedValue(null),create: insert,delete:remove},
    };
    const storage = {
      createUploadUrl: jest.fn().mockRejectedValue(new Error('QA injected Storage failure')),
    };
    const service = new FilesService(prisma as unknown as PrismaService, storage as unknown as StorageService);
    await expect(service.createUploadIntent('qa-owner', {
      dataRoomId:'00000000-0000-4000-8000-000000000001',
      name:'qa-file.pdf', mimeType:'application/pdf', size:2048,
    })).rejects.toThrow('QA injected Storage failure');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({uploadedAt:null,name:'qa-file.pdf'}),
    }));
    expect(remove).not.toHaveBeenCalled();
    // Expected product behavior: failure must not leave an unrecoverable pending name reservation.
  });
});
