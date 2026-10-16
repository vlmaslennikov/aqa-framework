/** Database-free, source-level reproductions of two known VDR validation gaps.
 * These assertions show the CURRENT unsafe behavior (thus PASS indicates a reproduced
 * finding, not healthy product behavior). The expected-red HTTP tests remain separate.
 */
import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { RegisterDto } from '../src/auth/dto/register.dto';
import { FilesService } from '../src/files/files.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';

jest.mock('@/common/access', () => ({
  ...jest.requireActual('@/common/access'),
  requireAccess: jest.fn(async () => undefined),
}));

describe('Product findings — boundary reproductions (not passing requirements)', () => {
  it('QA-AUTH-06: Nest validation currently accepts whitespace-only name', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true });
    const input = {
      name: '   ',
      email: 'qa-boundary@example.invalid',
      password: 'qa-strong-password-123',
    };
    const metadata: ArgumentMetadata = { type: 'body', metatype: RegisterDto, data: undefined };
    const result = await pipe.transform(input, metadata) as RegisterDto;
    expect(result.name).toBe('   ');
    // Desired business acceptance instead: validation rejects blank trimmed name with 400.
  });

  it('QA-FILE-02: completion currently persists actual Storage size >50 MiB', async () => {
    const limit = 50 * 1024 * 1024;
    const prisma = {
      file: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'qa-file', dataRoomId: 'qa-room', storageKey: 'qa-storage-key',
        }),
        update: jest.fn().mockResolvedValue({ id: 'qa-file', name: 'oversize.pdf', folderId: null }),
      },
    };
    const storage = {
      getObjectInfo: jest.fn().mockResolvedValue({ size: limit + 1 }),
    };
    const service = new FilesService(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
    );
    await expect(service.completeUpload('qa-owner', 'qa-file')).resolves.toMatchObject({ id: 'qa-file' });
    expect(prisma.file.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ size: limit + 1, uploadedAt: expect.any(Date) }),
    }));
    // Desired business acceptance instead: reject actual bytes >limit and keep upload pending.
    // This test fakes Storage metadata; it does NOT demonstrate real Supabase bypass.
  });
});
