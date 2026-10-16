/**
 * QA PDF lifecycle, LOCAL PostgreSQL + real NestJS HTTP + loopback byte storage.
 * Supabase signing, CORS and content-type validation are NOT exercised here.
 * The optional browser/storage E2E suite handles the real signed-URL boundary.
 */
import { createHash, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { openQaHarness, authorization, type Actor, type QaHarness } from './qa-support/harness';

const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n', 'utf8');

describe('QA PDF lifecycle: local byte-storage boundary', () => {
  let qa: QaHarness;
  let owner: Actor;
  let viewer: Actor;
  let storage: Server;
  let storageOrigin: string;
  const payloads = new Map<string, Buffer>();
  const storageRequests: string[] = [];

  beforeAll(async () => {
    qa = await openQaHarness(); // Guarded against nonlocal databases, even when Jest run directly.
    owner = await qa.actor('pdf-owner');
    viewer = await qa.actor('pdf-viewer');

    // The fake storage is a REAL loopback HTTP server preserving uploaded bytes.
    // It does not pretend to implement Supabase's multipart signed-upload contract.
    storage = createServer(async (req, res) => {
      try {
        const match = /^\/(upload|view|download)\/([0-9a-f-]{36})$/.exec(req.url ?? '');
        if (!match) { res.writeHead(404).end(); return; }
        const [, operation, key] = match;
        storageRequests.push(`${req.method} ${operation}`);
        if (operation === 'upload' && req.method === 'PUT') {
          const parts: Buffer[] = [];
          for await (const part of req) parts.push(Buffer.isBuffer(part) ? part : Buffer.from(part));
          payloads.set(key, Buffer.concat(parts));
          res.writeHead(201).end();
          return;
        }
        if ((operation === 'download' || operation === 'view') && req.method === 'GET') {
          const bytes = payloads.get(key);
          if (!bytes) { res.writeHead(404).end(); return; }
          res.writeHead(200, { 'content-type': 'application/pdf', 'content-length': bytes.length }).end(bytes);
          return;
        }
        res.writeHead(405).end();
      } catch { res.writeHead(500).end(); }
    });
    await new Promise<void>((resolve, reject) => {
      storage.once('error', reject);
      storage.listen(0, '127.0.0.1', () => { storage.off('error', reject); resolve(); });
    });
    const port = (storage.address() as AddressInfo).port;
    storageOrigin = `http://127.0.0.1:${port}`;
    qa.storageMock.createUploadUrl.mockImplementation(async (key: string) => `${storageOrigin}/upload/${key}`);
    qa.storageMock.createViewUrl.mockImplementation(async (key: string) => `${storageOrigin}/view/${key}`);
    qa.storageMock.createDownloadUrl.mockImplementation(async (key: string) => `${storageOrigin}/download/${key}`);
    qa.storageMock.getObjectInfo.mockImplementation(async (key: string) => {
      const bytes = payloads.get(key);
      return bytes ? { size: bytes.length } : null;
    });
    qa.storageMock.removeObject.mockImplementation(async (key: string) => { payloads.delete(key); });
    qa.storageMock.removeObjects.mockImplementation(async (keys: string[]) => { keys.forEach(key => payloads.delete(key)); });
  });

  afterAll(async () => {
    try { if (qa) await qa.cleanup(); }
    finally { if (storage?.listening) await new Promise<void>((resolve, reject) => storage.close(err => err ? reject(err) : resolve())); }
  });

  async function createFolder(name: string) {
    const response = await qa.http().post('/folders').set(authorization(owner))
      .send({ dataRoomId: owner.roomId, name: `${name}-${randomUUID().slice(0, 8)}` });
    expect(response.status).toBe(201);
    return response.body.id as string;
  }

  async function uploadIntent(folderId: string, name: string, size = pdf.length) {
    const response = await qa.http().post('/files/upload-intent').set(authorization(owner))
      .send({ dataRoomId: owner.roomId, folderId, name, size, mimeType: 'application/pdf' });
    expect(response.status).toBe(201);
    expect(response.body.uploadUrl).toMatch(/^http:\/\/127\.0\.0\.1:/);
    return response.body as { fileId: string; name: string; uploadUrl: string };
  }

  it('round trips real bytes through signed-url adapter, downloads identical SHA-256, renames, moves and deletes', async () => {
    const sourceId = await createFolder('qa-source');
    const destinationId = await createFolder('qa-destination');
    const intent = await uploadIntent(sourceId, `qa-${randomUUID()}.pdf`);
    const pending = await qa.prisma.file.findUniqueOrThrow({ where: { id: intent.fileId } });
    expect(pending.uploadedAt).toBeNull();
    expect((await qa.http().get(`/files/${intent.fileId}`).set(authorization(owner))).status).toBe(404);
    expect((await qa.http().get(`/files/${intent.fileId}/download-url`).set(authorization(owner))).status).toBe(404);
    expect((await qa.http().post(`/files/${intent.fileId}/complete`).set(authorization(owner))).status).toBe(400);

    // Byte payload travels through the fake storage HTTP boundary, not directly into the Map.
    const storageUpload = await fetch(intent.uploadUrl, { method: 'PUT', body: new Uint8Array(pdf) });
    expect(storageUpload.status).toBe(201);
    expect((await qa.http().post(`/files/${intent.fileId}/complete`).set(authorization(owner))).status).toBe(201);
    const verified = await qa.http().get(`/files/${intent.fileId}`).set(authorization(owner));
    expect(verified.status).toBe(200);
    expect(verified.body).toMatchObject({ name: intent.name, size: pdf.length, mimeType: 'application/pdf', folderId: sourceId });

    const view = await qa.http().get(`/files/${intent.fileId}/view-url`).set(authorization(owner));
    const download = await qa.http().get(`/files/${intent.fileId}/download-url`).set(authorization(owner));
    expect(view.status).toBe(200);
    expect(download.status).toBe(200);
    expect(Buffer.from(await (await fetch(view.body.url)).arrayBuffer())).toEqual(pdf);
    const downloaded = Buffer.from(await (await fetch(download.body.url)).arrayBuffer());
    expect(digest(downloaded)).toBe(digest(pdf));
    expect(storageRequests).toEqual(expect.arrayContaining(['PUT upload', 'GET view', 'GET download']));

    const originalKey = pending.storageKey;
    const renamed = await qa.http().patch(`/files/${intent.fileId}`).set(authorization(owner))
      .send({ name: 'renamed-lifecycle.pdf' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe('renamed-lifecycle.pdf');
    const moved = await qa.http().patch(`/files/${intent.fileId}/move`).set(authorization(owner))
      .send({ targetFolderId: destinationId });
    expect(moved.status).toBe(200);
    expect(moved.body.folderId).toBe(destinationId);
    const afterMove = await qa.prisma.file.findUniqueOrThrow({ where: { id: intent.fileId } });
    expect(afterMove.storageKey).toBe(originalKey);
    expect(afterMove.size).toBe(pdf.length);
    expect(digest(Buffer.from(await (await fetch((await qa.http().get(`/files/${intent.fileId}/download-url`).set(authorization(owner))).body.url)).arrayBuffer()))).toBe(digest(pdf));

    const deleted = await qa.http().delete(`/files/${intent.fileId}`).set(authorization(owner));
    expect(deleted.status).toBe(204);
    expect(await qa.prisma.file.findUnique({ where: { id: intent.fileId } })).toBeNull();
    expect(payloads.has(originalKey)).toBe(false);
    expect((await qa.http().get(`/files/${intent.fileId}`).set(authorization(owner))).status).toBe(404);
    expect(await qa.prisma.folder.count({ where: { id: { in: [sourceId, destinationId] } } })).toBe(2);
  });

  it('viewer and foreign owner cannot read, alter, complete, move or delete an unshared file', async () => {
    const folderId = await createFolder('qa-private');
    const intent = await uploadIntent(folderId, `private-${randomUUID()}.pdf`);
    expect((await qa.http().post(`/files/${intent.fileId}/complete`).set(authorization(viewer))).status).toBe(404);
    const upload = await fetch(intent.uploadUrl, { method: 'PUT', body: new Uint8Array(pdf) });
    expect(upload.status).toBe(201);
    expect((await qa.http().post(`/files/${intent.fileId}/complete`).set(authorization(owner))).status).toBe(201);
    for (const endpoint of [`/files/${intent.fileId}`, `/files/${intent.fileId}/view-url`, `/files/${intent.fileId}/download-url`]) {
      expect((await qa.http().get(endpoint).set(authorization(viewer))).status).toBe(404);
    }
    expect((await qa.http().patch(`/files/${intent.fileId}`).set(authorization(viewer)).send({ name: 'stolen.pdf' })).status).toBe(404);
    expect((await qa.http().patch(`/files/${intent.fileId}/move`).set(authorization(viewer)).send({ targetFolderId: null })).status).toBe(404);
    expect((await qa.http().delete(`/files/${intent.fileId}`).set(authorization(viewer))).status).toBe(404);
    // A legitimately authenticated owner cannot move their file into another tenant's folder.
    const foreignFolder = await qa.http().post('/folders').set(authorization(viewer))
      .send({ dataRoomId: viewer.roomId, name: `foreign-${randomUUID()}` });
    expect(foreignFolder.status).toBe(201);
    expect((await qa.http().patch(`/files/${intent.fileId}/move`).set(authorization(owner))
      .send({ targetFolderId: foreignFolder.body.id })).status).toBe(404);
    expect((await qa.prisma.file.findUniqueOrThrow({ where: { id: intent.fileId } })).folderId).toBe(folderId);
  });

  it('folder share allows PDF view/download but not mutation; revoke blocks new URLs', async () => {
    const folderId = await createFolder('qa-shared');
    const intent = await uploadIntent(folderId, `shared-${randomUUID()}.pdf`);
    expect((await fetch(intent.uploadUrl, { method: 'PUT', body: new Uint8Array(pdf) })).status).toBe(201);
    expect((await qa.http().post(`/files/${intent.fileId}/complete`).set(authorization(owner))).status).toBe(201);
    const share = await qa.http().post('/shares').set(authorization(owner)).send({
      resourceType: 'FOLDER', resourceId: folderId, mode: 'USER', granteeEmail: viewer.email,
    });
    expect(share.status).toBe(201);
    expect((await qa.http().get(`/files/${intent.fileId}/download-url`).set(authorization(viewer))).status).toBe(200);
    expect((await qa.http().get(`/files/${intent.fileId}/view-url`).set(authorization(viewer))).status).toBe(200);
    expect((await qa.http().patch(`/files/${intent.fileId}`).set(authorization(viewer)).send({ name: 'mutate.pdf' })).status).toBe(404);
    expect((await qa.http().delete(`/files/${intent.fileId}`).set(authorization(viewer))).status).toBe(404);
    expect((await qa.http().delete(`/shares/${share.body.id}`).set(authorization(owner))).status).toBe(204);
    expect((await qa.http().get(`/files/${intent.fileId}/view-url`).set(authorization(viewer))).status).toBe(404);
    expect((await qa.http().get(`/files/${intent.fileId}/download-url`).set(authorization(viewer))).status).toBe(404);
    // Previously-issued URLs remain usable in this fake; see separate signed-URL TTL risk.
  });

  it('storage deletion failure does not restore the metadata row (documented orphan-object policy)', async () => {
    const folderId = await createFolder('qa-orphan');
    const intent = await uploadIntent(folderId, `orphan-${randomUUID()}.pdf`);
    expect((await fetch(intent.uploadUrl, { method: 'PUT', body: new Uint8Array(pdf) })).status).toBe(201);
    expect((await qa.http().post(`/files/${intent.fileId}/complete`).set(authorization(owner))).status).toBe(201);
    const key = (await qa.prisma.file.findUniqueOrThrow({ where: { id: intent.fileId } })).storageKey;
    qa.storageMock.removeObject.mockRejectedValueOnce(new Error('simulated storage outage'));
    expect((await qa.http().delete(`/files/${intent.fileId}`).set(authorization(owner))).status).toBe(204);
    expect(await qa.prisma.file.findUnique({ where: { id: intent.fileId } })).toBeNull();
    expect(payloads.has(key)).toBe(true); // Explicitly report orphan risk, not a PASS for storage cleanup.
  });
});
