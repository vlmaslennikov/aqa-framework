import { authorization, Actor, openQaHarness, QaHarness } from './qa-support/harness';

/** All 3 share scopes x both share modes; verify scope boundaries and revocation.
 * Local QA PostgreSQL only; Storage provider is mocked, no public-demo mutations. */
describe('QA sharing matrix: DATAROOM, FOLDER, FILE x USER, PUBLIC_LINK', () => {
  let qa: QaHarness;
  let owner: Actor, viewer: Actor, outsider: Actor;
  let folderId: string, fileId: string, unrelatedFileId: string;

  beforeAll(async () => {
    qa = await openQaHarness();
    owner = await qa.actor('sharing-owner');
    viewer = await qa.actor('sharing-viewer');
    outsider = await qa.actor('sharing-outsider');
    const folder = await qa.http().post('/folders').set(authorization(owner))
      .send({ dataRoomId: owner.roomId, name: 'Shared Scope' });
    expect(folder.status).toBe(201);
    folderId = folder.body.id;
    async function pdf(name: string, id?: string) {
      const intent = await qa.http().post('/files/upload-intent').set(authorization(owner))
        .send({ dataRoomId: owner.roomId, ...(id ? { folderId: id } : {}), name, size: 100, mimeType: 'application/pdf' });
      expect(intent.status).toBe(201);
      const file = await qa.prisma.file.findUniqueOrThrow({ where: { id: intent.body.fileId } });
      qa.objects.set(file.storageKey, { size: 100 });
      expect((await qa.http().post(`/files/${file.id}/complete`).set(authorization(owner))).status).toBe(201);
      return file.id;
    }
    fileId = await pdf('within-scope.pdf', folderId);
    unrelatedFileId = await pdf('outside-scope.pdf');
  });
  afterAll(async () => { if (qa) await qa.cleanup(); });

  for (const type of ['DATAROOM', 'FOLDER', 'FILE'] as const) {
    const resourceId = () => type === 'DATAROOM' ? owner.roomId : type === 'FOLDER' ? folderId : fileId;
    it(`REQ-SHARE USER ${type}: recipient sees only authorized subtree, cannot mutate, revoke blocks subsequent reads`, async () => {
      const share = await qa.http().post('/shares').set(authorization(owner))
        .send({ resourceType: type, resourceId: resourceId(), mode: 'USER', granteeEmail: viewer.email });
      expect(share.status).toBe(201);
      try {
        expect((await qa.http().get(`/files/${fileId}`).set(authorization(viewer))).status).toBe(200);
        expect((await qa.http().get(`/files/${fileId}/download-url`).set(authorization(viewer))).status).toBe(200);
        expect((await qa.http().get(`/files/${fileId}`).set(authorization(outsider))).status).toBe(404);
        expect((await qa.http().patch(`/files/${fileId}`).set(authorization(viewer)).send({ name: 'unauthorized.pdf' })).status).toBe(404);
        expect((await qa.http().delete(`/files/${fileId}`).set(authorization(viewer))).status).toBe(404);
        expect((await qa.http().get(`/files/${unrelatedFileId}`).set(authorization(viewer))).status)
          .toBe(type === 'DATAROOM' ? 200 : 404);
        expect((await qa.http().get(`/data-rooms/${owner.roomId}`).set(authorization(viewer))).status)
          .toBe(type === 'DATAROOM' ? 200 : 404);
        expect((await qa.http().get(`/folders/${folderId}/contents`).set(authorization(viewer))).status)
          .toBe(type === 'FILE' ? 404 : 200);
      } finally {
        expect((await qa.http().delete(`/shares/${share.body.id}`).set(authorization(owner))).status).toBe(204);
      }
      expect((await qa.http().get(`/files/${fileId}`).set(authorization(viewer))).status).toBe(404);
      expect((await qa.http().get(`/files/${fileId}/download-url`).set(authorization(viewer))).status).toBe(404);
    });

    it(`REQ-SHARE PUBLIC_LINK ${type}: anonymous scoped read, ID substitution rejected, revoke invalidates token`, async () => {
      const share = await qa.http().post('/shares').set(authorization(owner))
        .send({ resourceType: type, resourceId: resourceId(), mode: 'PUBLIC_LINK' });
      expect(share.status).toBe(201);
      const token = share.body.token as string;
      expect(token).toEqual(expect.any(String));
      try {
        expect((await qa.http().get(`/public/${token}`)).status).toBe(200);
        expect((await qa.http().get(`/public/${token}/files/${fileId}`)).status).toBe(200);
        expect((await qa.http().get(`/public/${token}/files/${fileId}/view-url`)).status).toBe(200);
        expect((await qa.http().get(`/public/${token}/files/${unrelatedFileId}`)).status)
          .toBe(type === 'DATAROOM' ? 200 : 404);
        expect((await qa.http().get(`/public/${token}/contents`)).status)
          .toBe(type === 'DATAROOM' ? 200 : 404);
        expect((await qa.http().get(`/public/${token}/folders/${folderId}/contents`)).status)
          .toBe(type === 'FILE' ? 404 : 200);
      } finally {
        expect((await qa.http().delete(`/shares/${share.body.id}`).set(authorization(owner))).status).toBe(204);
      }
      expect((await qa.http().get(`/public/${token}`)).status).toBe(410);
      expect((await qa.http().get(`/public/${token}/files/${fileId}`)).status).toBe(410);
    });
  }
});
