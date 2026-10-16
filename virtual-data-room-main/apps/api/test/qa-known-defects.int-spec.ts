import { randomUUID } from 'node:crypto';
import { openQaHarness, authorization, Actor, QaHarness } from './qa-support/harness';
/** Deliberately FAILING regression tests for known code-level findings. Run separately. */
describe('Known issues (expected red until product code is fixed)', () => {
  let qa: QaHarness, owner: Actor;
  beforeAll(async () => { qa = await openQaHarness(); owner = await qa.actor('oversized'); });
  afterAll(async () => { if (qa) await qa.cleanup(); });

  it('registration must reject a whitespace-only name', async () => {
    const email = `qa-invalid-${randomUUID()}@example.test`;
    qa.emails.push(email); // Ensure cleanup even if the invalid request is wrongly accepted.
    const res = await qa.http().post('/auth/register').send({ email, name: '   ', password: 'qa-strong-password-123' });
    expect(res.status).toBe(400); // Current implementation may return 201.
  });

  it('complete upload must reject actual Storage size >50MiB', async () => {
    const intent = await qa.http().post('/files/upload-intent').set(authorization(owner)).send({
      dataRoomId: owner.roomId, name: 'storage-oversized.pdf', mimeType: 'application/pdf', size: 100,
    });
    expect(intent.status).toBe(201);
    const row = await qa.prisma.file.findUniqueOrThrow({ where: { id: intent.body.fileId } });
    qa.objects.set(row.storageKey, { size: 50 * 1024 * 1024 + 1 });
    const completed = await qa.http().post(`/files/${row.id}/complete`).set(authorization(owner));
    expect(completed.status).toBe(400); // Current implementation may return 201.
    expect((await qa.prisma.file.findUniqueOrThrow({ where: { id: row.id } })).uploadedAt).toBeNull();
  });
});
