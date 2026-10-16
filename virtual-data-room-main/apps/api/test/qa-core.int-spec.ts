import { openQaHarness, authorization, Actor, QaHarness } from './qa-support/harness';

/** REAL HTTP -> controller -> service -> Prisma -> LOCAL PostgreSQL.
 * The only fake dependency is Supabase Storage. No public-demo writes. */
describe('QA integration: auth, access, shares and uploads', () => {
  let qa: QaHarness;
  let owner: Actor, viewer: Actor;
  let parentId: string, childId: string, fileId: string;

  beforeAll(async () => {
    qa = await openQaHarness();
    owner = await qa.actor('owner');
    viewer = await qa.actor('viewer');
    const parent = await qa.http().post('/folders').set(authorization(owner))
      .send({ name: 'Private Parent', dataRoomId: owner.roomId });
    expect(parent.status).toBe(201);
    parentId = parent.body.id;
    const child = await qa.http().post('/folders').set(authorization(owner))
      .send({ name: 'Shared Child', dataRoomId: owner.roomId, parentId });
    expect(child.status).toBe(201);
    childId = child.body.id;
    const intent = await qa.http().post('/files/upload-intent').set(authorization(owner))
      .send({ name: 'qa-test.pdf', dataRoomId: owner.roomId, folderId: childId, size: 256, mimeType: 'application/pdf' });
    expect(intent.status).toBe(201);
    fileId = intent.body.fileId;
    const file = await qa.prisma.file.findUniqueOrThrow({ where: { id: fileId } });
    qa.objects.set(file.storageKey, { size: 256 });
    expect((await qa.http().post(`/files/${fileId}/complete`).set(authorization(owner))).status).toBe(201);
  });
  afterAll(async () => { if (qa) await qa.cleanup(); });

  it('registration creates user and default room; /auth/me validates token', async () => {
    expect(await qa.prisma.dataRoom.count({ where: { ownerId: owner.id } })).toBe(1);
    const me = await qa.http().get('/auth/me').set(authorization(owner));
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(owner.email);
  });

  it('IDOR: viewer and anonymous actor cannot access private resources', async () => {
    expect((await qa.http().get(`/data-rooms/${owner.roomId}`).set(authorization(viewer))).status).toBe(404);
    expect((await qa.http().get(`/folders/${childId}/contents`).set(authorization(viewer))).status).toBe(404);
    expect((await qa.http().get(`/files/${fileId}`).set(authorization(viewer))).status).toBe(404);
    expect((await qa.http().get(`/files/${fileId}/view-url`)).status).toBe(401);
  });

  it('nested USER share grants read, hides private ancestors, denies mutation, then revoke denies read', async () => {
    const share = await qa.http().post('/shares').set(authorization(owner)).send({
      resourceType: 'FOLDER', resourceId: childId, mode: 'USER', granteeEmail: viewer.email,
    });
    expect(share.status).toBe(201);
    expect((await qa.http().get(`/folders/${childId}/contents`).set(authorization(viewer))).status).toBe(200);
    expect((await qa.http().get(`/files/${fileId}/view-url`).set(authorization(viewer))).status).toBe(200);
    const crumbs = await qa.http().get(`/folders/${childId}/breadcrumbs`).set(authorization(viewer));
    expect(crumbs.status).toBe(200);
    expect(crumbs.body.dataRoomName).toBeNull();
    expect(crumbs.body.folders).toEqual([{ id: childId, name: 'Shared Child' }]);
    expect((await qa.http().patch(`/folders/${childId}`).set(authorization(viewer)).send({ name: 'Forbidden' })).status).toBe(404);
    expect((await qa.http().delete(`/shares/${share.body.id}`).set(authorization(owner))).status).toBe(204);
    expect((await qa.http().get(`/files/${fileId}`).set(authorization(viewer))).status).toBe(404);
  });

  it('PUBLIC_LINK grants a scoped read and becomes 410 after revoke', async () => {
    const share = await qa.http().post('/shares').set(authorization(owner)).send({
      resourceType: 'FILE', resourceId: fileId, mode: 'PUBLIC_LINK',
    });
    expect(share.status).toBe(201);
    const token = share.body.token;
    expect(typeof token).toBe('string');
    expect((await qa.http().get(`/public/${token}/files/${fileId}`)).status).toBe(200);
    expect((await qa.http().delete(`/shares/${share.body.id}`).set(authorization(owner))).status).toBe(204);
    expect((await qa.http().get(`/public/${token}/files/${fileId}`)).status).toBe(410);
  });

  it('failed storage verification leaves file unconfirmed, successful retry marks it uploaded', async () => {
    const res = await qa.http().post('/files/upload-intent').set(authorization(owner)).send({
      dataRoomId: owner.roomId, name: 'pending.pdf', size: 120, mimeType: 'application/pdf',
    });
    expect(res.status).toBe(201);
    const id = res.body.fileId;
    expect((await qa.http().post(`/files/${id}/complete`).set(authorization(owner))).status).toBe(400);
    expect((await qa.prisma.file.findUniqueOrThrow({ where: { id } })).uploadedAt).toBeNull();
    const storageKey = (await qa.prisma.file.findUniqueOrThrow({ where: { id } })).storageKey;
    qa.objects.set(storageKey, { size: 120 });
    expect((await qa.http().post(`/files/${id}/complete`).set(authorization(owner))).status).toBe(201);
    expect((await qa.prisma.file.findUniqueOrThrow({ where: { id } })).uploadedAt).not.toBeNull();
  });

  it('validation rejects PDF uploads over 50MiB at intent stage', async () => {
    const res = await qa.http().post('/files/upload-intent').set(authorization(owner)).send({
      dataRoomId: owner.roomId, name: 'huge.pdf', size: 50 * 1024 * 1024 + 1, mimeType: 'application/pdf',
    });
    expect(res.status).toBe(400);
  });

  it('folder subtree delete removes only test-owned nested resources', async () => {
    const deleted = await qa.http().delete(`/folders/${parentId}`).set(authorization(owner));
    expect(deleted.status).toBe(204);
    expect(await qa.prisma.folder.findUnique({ where: { id: childId } })).toBeNull();
    expect(await qa.prisma.file.findUnique({ where: { id: fileId } })).toBeNull();
    expect(await qa.prisma.dataRoom.count({ where: { id: viewer.roomId } })).toBe(1);
  });
});
