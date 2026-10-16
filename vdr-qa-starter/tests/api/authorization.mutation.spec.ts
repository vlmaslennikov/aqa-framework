import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import {
  apiURL, bearer, credentials, json, login, requireDisposableEnvironment,
  type DataRoom, type Folder, type PageResponse,
} from '../../src/support/api';

// Uses a newly registered owner to ensure no inherited shares contaminate access tests.
// Account/room deletion is not offered by the API. Run ONLY against a disposable environment.
const viewer = credentials('viewer');
test.describe('@mutation @security authorization and revocation', () => {
  test.skip(!requireDisposableEnvironment(), 'Set RUN_MUTATION_TESTS=1 ONLY against an authorized disposable environment');
  test.skip(!viewer, 'VIEWER_EMAIL and VIEWER_PASSWORD are required');

  test('viewer gains nested read-only access and loses it after owner revokes', async ({ request }) => {
    const newOwner = {
      email: `qa-owner-${randomUUID()}@example.test`,
      password: `Test-${randomUUID()}-safe`,
      name: 'QA owner',
    };
    const register = await request.post(`${apiURL}/auth/register`, { data: newOwner });
    const ownerToken = (await json<{ accessToken: string }>(register)).accessToken;
    const viewerToken = await login(request, viewer!);
    const ownerHeaders = bearer(ownerToken);
    const viewerHeaders = bearer(viewerToken);
    const rooms = await request.get(`${apiURL}/data-rooms`, { headers: ownerHeaders });
    const roomsPage = await json<PageResponse<DataRoom>>(rooms);
    expect(roomsPage.items.length).toBeGreaterThan(0);
    const dataRoomId = roomsPage.items[0].id;

    const root = await json<Folder>(await request.post(`${apiURL}/folders`, {
      headers: ownerHeaders,
      data: { dataRoomId, name: `QA-${randomUUID()}` },
    }));
    const child = await json<Folder>(await request.post(`${apiURL}/folders`, {
      headers: ownerHeaders,
      data: { dataRoomId, name: 'Nested', parentId: root.id },
    }));

    try {
      const before = await request.get(`${apiURL}/folders/${child.id}/contents`, { headers: viewerHeaders });
      expect([403, 404]).toContain(before.status());

      const share = await json<{ id: string }>(await request.post(`${apiURL}/shares`, {
        headers: ownerHeaders,
        data: { resourceType: 'FOLDER', resourceId: root.id, mode: 'USER', granteeEmail: viewer!.email },
      }));
      try {
        const after = await request.get(`${apiURL}/folders/${child.id}/contents`, { headers: viewerHeaders });
        expect(after.status()).toBe(200);

        const viewerMutation = await request.patch(`${apiURL}/folders/${child.id}`, {
          headers: viewerHeaders, data: { name: 'Viewer must not rename' },
        });
        expect([403, 404]).toContain(viewerMutation.status());
      } finally {
        const revoke = await request.delete(`${apiURL}/shares/${share.id}`, { headers: ownerHeaders });
        expect(revoke.status()).toBe(204);
      }
      const afterRevocation = await request.get(`${apiURL}/folders/${child.id}/contents`, { headers: viewerHeaders });
      expect([403, 404]).toContain(afterRevocation.status());
    } finally {
      const cleanup = await request.delete(`${apiURL}/folders/${root.id}`, { headers: ownerHeaders });
      expect(cleanup.status()).toBe(204);
    }
  });
});
