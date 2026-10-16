/**
 * Run only against a LOCAL running VDR with a DISPOSABLE Supabase Storage project/bucket.
 * Upload crosses real React -> NestJS -> signed Supabase PUT -> metadata confirmation.
 * Read/rename/move/delete use authenticated HTTP endpoints for precise integrity assertions.
 * NEVER run against the shared Vercel/Railway demo.
 */
import { createHash, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { apiURL, bearer } from '../../src/support/api';
import { assertStorageE2eTarget } from '../../scripts/guard-storage.mjs';
import { resolveStorageRoomId } from '../../scripts/storage-room.mjs';

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
// Deterministic valid one-page PDF fixture; SHA-256 verifies byte-level round-trip.
// Use a minimal PDF generator to avoid adding an extra dependency.
function fixturePdf(): Buffer {
  const content = 'BT /F1 12 Tf 40 100 Td (QA lifecycle roundtrip) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`,
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, value] of objects.entries()) {
    offsets.push(Buffer.byteLength(body, 'ascii'));
    body += `${index + 1} 0 obj\n${value}\nendobj\n`;
  }
  const xrefAt = Buffer.byteLength(body, 'ascii');
  body += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(body, 'ascii');
}

test('@mutation @storage real PDF UI upload, download SHA-256, rename, move and delete', async ({ page, request }) => {
  test.setTimeout(120_000);
  // Must guard at test runtime too: passing a CLI flag must not bypass safety.
  assertStorageE2eTarget(process.env);
  // A new account always owns exactly one freshly created room in the disposable database.
  // Do not depend on credentials from the shared public demo being present locally.
  const account = { email: `qa-storage-${randomUUID()}@example.test`, name: 'QA Storage Owner',
    password: `Qa-strong-${randomUUID()}` };
  const registered = await request.post(`${apiURL}/auth/register`, { data: account });
  expect(registered.status(), 'Disposable local account registration must succeed').toBe(201);
  const { accessToken: token } = await registered.json() as { accessToken: string };
  expect(token).toEqual(expect.any(String));
  const auth = { headers: bearer(token) };
  const roomId = process.env.QA_E2E_ROOM_ID || await resolveStorageRoomId(request, apiURL, auth.headers);
  const room = await request.get(`${apiURL}/data-rooms/${roomId}`, auth);
  expect(room.status(), 'Owner must have access to local QA room').toBe(200);
  expect((await room.json()).accessLevel, 'Storage E2E requires owned local room').toBe('OWNER');

  const bytes = fixturePdf();
  const fileName = `qa-lifecycle-${randomUUID()}.pdf`;
  let fileId: string | undefined;
  let folderId: string | undefined;
  let shareId: string | undefined;
  try {
    // This uses the actual React upload queue; signed upload goes to real test Supabase.
    await page.addInitScript(value => localStorage.setItem('dataroom_token', value), token);
    await page.goto(`/room/${roomId}`);
    await expect(page.getByRole('button', { name: /upload/i }).first()).toBeVisible();
    const intentResponse = page.waitForResponse(r =>
      r.url().includes('/files/upload-intent') && r.request().method() === 'POST', { timeout: 30_000 });
    await page.locator('input[type="file"]').setInputFiles({ name: fileName, mimeType: 'application/pdf', buffer: bytes });
    const intent = await intentResponse;
    expect(intent.status(), `Upload intent HTTP ${intent.status()}`).toBe(201);
    const intentData = await intent.json() as { fileId: string };
    fileId = intentData.fileId;
    expect(fileId).toMatch(/^[0-9a-f-]{36}$/i);

    // The frontend uploads bytes and performs /complete; assert the uploaded record via API.
    await expect.poll(async () => {
      const r = await request.get(`${apiURL}/files/${fileId}`, auth);
      return r.status();
    }, { timeout: 60_000, message: 'Waiting for UI upload + storage verification' }).toBe(200);

    const meta = await (await request.get(`${apiURL}/files/${fileId}`, auth)).json() as {
      id: string; name: string; size: number; mimeType: string;
    };
    expect(meta).toMatchObject({ name: fileName, size: bytes.length, mimeType: 'application/pdf' });
    await page.goto(`/file/${fileId}`);
    await expect(page.locator('object[type="application/pdf"]')).toBeVisible();
    const signed = await request.get(`${apiURL}/files/${fileId}/download-url`, auth);
    expect(signed.status()).toBe(200);
    const { url } = await signed.json() as { url: string };
    const download = await request.get(url);
    expect(download.ok(), `Storage download HTTP ${download.status()}`).toBeTruthy();
    expect(download.headers()['content-type']).toContain('application/pdf');
    expect(sha256(await download.body())).toBe(sha256(bytes));

    const renamed = await request.patch(`${apiURL}/files/${fileId}`, {
      ...auth, data: { name: `renamed-${fileName}` },
    });
    expect(renamed.status()).toBe(200);
    const folder = await request.post(`${apiURL}/folders`, {
      ...auth, data: { dataRoomId: roomId, name: `qa-target-${randomUUID()}` },
    });
    expect(folder.status()).toBe(201);
    folderId = (await folder.json() as { id: string }).id;
    const moved = await request.patch(`${apiURL}/files/${fileId}/move`, {
      ...auth, data: { targetFolderId: folderId },
    });
    expect(moved.status()).toBe(200);
    const newMetadata = await (await request.get(`${apiURL}/files/${fileId}`, auth)).json() as {
      name: string; folderId: string;
    };
    expect(newMetadata.name).toBe(`renamed-${fileName}`);
    expect(newMetadata.folderId).toBe(folderId);
    const newUrl = await request.get(`${apiURL}/files/${fileId}/download-url`, auth);
    expect(newUrl.status()).toBe(200);
    expect(sha256(await (await request.get((await newUrl.json() as { url: string }).url)).body())).toBe(sha256(bytes));

    // Evidence-based revocation experiment. A previously issued Storage URL MAY
    // remain valid during its TTL. This is NOT automatically classified as a bug:
    // the required revocation semantics must be established with the product owner.
    const createShare = await request.post(`${apiURL}/shares`, {
      ...auth, data: { resourceType: 'FILE', resourceId: fileId, mode: 'PUBLIC_LINK' },
    });
    expect(createShare.status()).toBe(201);
    const share = await createShare.json() as { id: string; token: string };
    shareId = share.id;
    const publicDownload = () => request.get(`${apiURL}/public/${share.token}/files/${fileId}/download-url`);
    const issued = await publicDownload();
    expect(issued.status()).toBe(200);
    const oldUrl = (await issued.json() as { url: string }).url;
    const beforeRevoke = await request.get(oldUrl);
    expect(beforeRevoke.status()).toBe(200);
    expect(sha256(await beforeRevoke.body())).toBe(sha256(bytes));
    const revoked = await request.delete(`${apiURL}/shares/${shareId}`, auth);
    expect(revoked.status()).toBe(204);
    shareId = undefined;
    const newRequestAfterRevoke = await publicDownload();
    expect([403, 404, 410]).toContain(newRequestAfterRevoke.status());
    const oldRequestAfterRevoke = await request.get(oldUrl, { failOnStatusCode: false });
    const oldUrlStillValid = oldRequestAfterRevoke.status() === 200 &&
      sha256(await oldRequestAfterRevoke.body()) === sha256(bytes);
    await test.info().attach('signed-url-revocation-observation.json', {
      body: Buffer.from(JSON.stringify({
        observedAt: new Date().toISOString(),
        publicApiStatusAfterRevoke: newRequestAfterRevoke.status(),
        previouslySignedUrlStatusAfterRevoke: oldRequestAfterRevoke.status(),
        previouslySignedUrlStillReturnedOriginalPdf: oldUrlStillValid,
        productRequirementForImmediateRevocation: 'UNSPECIFIED',
        // Do not attach token/signed URL/headers: they are credentials.
      }, null, 2)), contentType: 'application/json',
    });

    expect((await request.delete(`${apiURL}/files/${fileId}`, auth)).status()).toBe(204);
    fileId = undefined;
  } finally {
    if (shareId) await request.delete(`${apiURL}/shares/${shareId}`, auth).catch(() => null);
    // Cleanup is limited to resources created by THIS test. No broad room deletion.
    if (fileId) {
      const r = await request.delete(`${apiURL}/files/${fileId}`, auth).catch(() => null);
      if (r && r.status() !== 204 && r.status() !== 404) console.warn(`QA cleanup file status ${r.status()}`);
    }
    if (folderId) {
      const r = await request.delete(`${apiURL}/folders/${folderId}`, auth).catch(() => null);
      if (r && r.status() !== 204 && r.status() !== 404) console.warn(`QA cleanup folder status ${r.status()}`);
    }
  }
});
