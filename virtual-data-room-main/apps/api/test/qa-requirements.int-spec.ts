import { authorization, Actor, openQaHarness, QaHarness } from './qa-support/harness';

/** Requirement-oriented black-box checks. Real Nest HTTP + Prisma + disposable local PostgreSQL.
 * Only Supabase Storage is faked. No calls to the publicly deployed VDR.
 * Each case owns all created data through its run-specific QA actors. */
describe('QA requirements: names, pagination, deletion preview', () => {
  let qa: QaHarness;
  let owner: Actor;
  let foreign: Actor;

  beforeAll(async () => {
    qa = await openQaHarness();
    owner = await qa.actor('requirements-owner');
    foreign = await qa.actor('requirements-foreign');
  });
  afterAll(async () => { if (qa) await qa.cleanup(); });

  async function folder(name: string, parentId?: string) {
    const result = await qa.http().post('/folders').set(authorization(owner))
      .send({ name, dataRoomId: owner.roomId, ...(parentId ? { parentId } : {}) });
    expect(result.status).toBe(201);
    return result.body.id as string;
  }

  async function intent(name: string, folderId?: string, size = 100) {
    const result = await qa.http().post('/files/upload-intent').set(authorization(owner))
      .send({ name, dataRoomId: owner.roomId, ...(folderId ? { folderId } : {}), size, mimeType: 'application/pdf' });
    expect(result.status).toBe(201);
    return { id: result.body.fileId as string, name: result.body.name as string };
  }

  async function upload(fileId: string, size: number) {
    const row = await qa.prisma.file.findUniqueOrThrow({ where: { id: fileId } });
    qa.objects.set(row.storageKey, { size });
    expect((await qa.http().post(`/files/${fileId}/complete`).set(authorization(owner))).status).toBe(201);
  }

  it('REQ-FOLDER: trims names and rejects case-insensitive sibling create/rename conflicts', async () => {
    const parentId = await folder(' Names ');
    const a = await folder('Reports', parentId);
    const duplicate = await qa.http().post('/folders').set(authorization(owner))
      .send({ name: '  reports  ', dataRoomId: owner.roomId, parentId });
    expect(duplicate.status).toBe(409);
    const b = await folder('Archive', parentId);
    const rename = await qa.http().patch(`/folders/${b}`).set(authorization(owner)).send({ name: 'REPORTS' });
    expect(rename.status).toBe(409);
    expect((await qa.prisma.folder.findUniqueOrThrow({ where: { id: a } })).name).toBe('Reports');
    expect((await qa.prisma.folder.findUniqueOrThrow({ where: { id: b } })).name).toBe('Archive');
    expect((await qa.prisma.folder.findUniqueOrThrow({ where: { id: parentId } })).name).toBe('Names');
  });

  it('REQ-FILE: resolves case-insensitive upload and move name conflicts without overwriting files', async () => {
    const destination = await folder('Destination');
    const first = await intent('Report.pdf');
    const second = await intent('report.pdf');
    expect(first.name).toBe('Report.pdf');
    expect(second.name).toBe('report (1).pdf');
    await upload(first.id, 100);
    await upload(second.id, 100);
    const target = await intent('report.pdf', destination);
    await upload(target.id, 100);
    const moved = await qa.http().patch(`/files/${first.id}/move`).set(authorization(owner))
      .send({ targetFolderId: destination });
    expect(moved.status).toBe(200);
    expect(moved.body.folderId).toBe(destination);
    expect(moved.body.name).toBe('Report (1).pdf');
    expect((await qa.prisma.file.findUniqueOrThrow({ where: { id: target.id } })).name).toBe('report.pdf');
    const foreignMove = await qa.http().patch(`/files/${first.id}/move`).set(authorization(foreign))
      .send({ targetFolderId: null });
    expect(foreignMove.status).toBe(404);
  });

  it('REQ-LIST: paginates across the folder/file boundary without lost, repeated or pending entries', async () => {
    const parentId = await folder('Pagination');
    const expectedIds: string[] = [];
    for (const name of ['Zulu', 'Alpha', 'Mike']) expectedIds.push(await folder(name, parentId));
    for (const name of ['Z.pdf', 'A.pdf', 'M.pdf']) {
      const file = await intent(name, parentId);
      expectedIds.push(file.id);
      await upload(file.id, 100);
    }
    const pending = await intent('pending.pdf', parentId);
    const seen: Array<{ id: string; type: string }> = [];
    let cursor: string | null = null;
    const cursors = new Set<string>();
    for (let n = 0; n < 10; n++) {
      const response = await qa.http().get(`/folders/${parentId}/contents`).set(authorization(owner))
        .query({ limit: 2, ...(cursor ? { cursor } : {}) });
      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeLessThanOrEqual(2);
      seen.push(...response.body.items);
      cursor = response.body.nextCursor;
      if (!cursor) break;
      expect(cursors.has(cursor)).toBe(false);
      cursors.add(cursor);
      if (n === 9) throw new Error('Pagination did not terminate within 10 pages');
    }
    expect(new Set(seen.map(x => x.id)).size).toBe(6);
    expect(new Set(seen.map(x => x.id))).toEqual(new Set(expectedIds));
    expect(seen.map(x => x.type)).toEqual(['folder', 'folder', 'folder', 'file', 'file', 'file']);
    expect(seen.some(x => x.id === pending.id)).toBe(false);
    expect((await qa.http().get(`/folders/${parentId}/contents?limit=0`).set(authorization(owner))).status).toBe(400);
    expect((await qa.http().get(`/folders/${parentId}/contents?cursor=invalid`).set(authorization(owner))).status).toBe(400);
  });

  it('REQ-DELETE: owner receives subtree counts and bytes; foreign actors cannot preview; deletion removes subtree', async () => {
    const parentId = await folder('Delete Preview');
    const childId = await folder('Nested', parentId);
    const rootFile = await intent('root.pdf', parentId, 210);
    const childFile = await intent('child.pdf', childId, 320);
    await upload(rootFile.id, 210);
    await upload(childFile.id, 320);
    await intent('unfinished.pdf', childId, 999);
    const preview = await qa.http().get(`/folders/${parentId}/delete-preview`).set(authorization(owner));
    expect(preview.status).toBe(200);
    expect(preview.body).toMatchObject({ folderCount: 1, fileCount: 2, totalSize: 530 });
    expect((await qa.http().get(`/folders/${parentId}/delete-preview`).set(authorization(foreign))).status).toBe(404);
    expect((await qa.http().delete(`/folders/${parentId}`).set(authorization(owner))).status).toBe(204);
    expect(await qa.prisma.folder.findUnique({ where: { id: childId } })).toBeNull();
    expect(await qa.prisma.file.findUnique({ where: { id: rootFile.id } })).toBeNull();
    expect(await qa.prisma.file.findUnique({ where: { id: childFile.id } })).toBeNull();
    expect(await qa.prisma.dataRoom.count({ where: { id: foreign.roomId } })).toBe(1);
  });
});
