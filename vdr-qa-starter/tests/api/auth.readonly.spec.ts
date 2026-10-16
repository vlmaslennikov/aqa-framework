import { expect, test } from '@playwright/test';
import { apiURL, bearer, credentials, login, type PageResponse, type DataRoom } from '../../src/support/api';

const owner = credentials('owner');

test('@smoke public health endpoint responds', async ({ request }) => {
  const response = await request.get(`${apiURL}/health`);
  expect(response.ok()).toBeTruthy();
});

test('@smoke login works and /auth/me returns matching identity', async ({ request }) => {
  test.skip(!owner, 'Supply OWNER_EMAIL and OWNER_PASSWORD in .env');
  const token = await login(request, owner!);
  const response = await request.get(`${apiURL}/auth/me`, { headers: bearer(token) });
  expect(response.status()).toBe(200);
  const me = await response.json() as { email: string; passwordHash?: string };
  expect(me.email).toBe(owner!.email.toLowerCase());
  expect(me).not.toHaveProperty('passwordHash');
});

test('@security wrong password does not authenticate', async ({ request }) => {
  test.skip(!owner, 'Supply OWNER_EMAIL and OWNER_PASSWORD in .env');
  const response = await request.post(`${apiURL}/auth/login`, {
    data: { email: owner!.email, password: 'invalid-' + Date.now() },
  });
  expect(response.status()).toBe(401);
});

test('@security anonymous request cannot enumerate private rooms', async ({ request }) => {
  const response = await request.get(`${apiURL}/data-rooms`);
  expect(response.status()).toBe(401);
});

test('@smoke private list API uses paginated response contract', async ({ request }) => {
  test.skip(!owner, 'Supply OWNER_EMAIL and OWNER_PASSWORD in .env');
  const token = await login(request, owner!);
  const response = await request.get(`${apiURL}/data-rooms?limit=1`, { headers: bearer(token) });
  expect(response.status()).toBe(200);
  const page = await response.json() as PageResponse<DataRoom>;
  expect(Array.isArray(page.items)).toBe(true);
  expect(page.items.length).toBeLessThanOrEqual(1);
  expect(page).toHaveProperty('nextCursor');
});
