import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { apiURL, bearer, json, requireDisposableEnvironment, type DataRoom, type PageResponse } from '../../src/support/api';

// Uses own disposable account and room, not someone else's shared demo data.
test.describe('@mutation @security public share lifecycle', () => {
  test.skip(!requireDisposableEnvironment(), 'Requires approved disposable API');
  test('a room public link stops resolving after owner revokes the share', async ({ request }) => {
    const owner = { email: `qa-${randomUUID()}@example.test`, password: `Test-${randomUUID()}`, name: 'QA public share owner' };
    const auth = await json<{ accessToken: string }>(await request.post(`${apiURL}/auth/register`, { data: owner }));
    const headers = bearer(auth.accessToken);
    const rooms = await json<PageResponse<DataRoom>>(await request.get(`${apiURL}/data-rooms`, { headers }));
    expect(rooms.items.length).toBeGreaterThan(0);
    const room = rooms.items[0];
    const share = await json<{ id: string; token: string }>(await request.post(`${apiURL}/shares`, {
      headers, data: { resourceType: 'DATAROOM', resourceId: room.id, mode: 'PUBLIC_LINK' },
    }));
    expect(share.token).toEqual(expect.any(String));
    try {
      const allowed = await request.get(`${apiURL}/public/${share.token}/contents`);
      expect(allowed.status()).toBe(200);
    } finally {
      expect((await request.delete(`${apiURL}/shares/${share.id}`, { headers })).status()).toBe(204);
    }
    const revoked = await request.get(`${apiURL}/public/${share.token}/contents`);
    expect([403, 404]).toContain(revoked.status());
  });
});
