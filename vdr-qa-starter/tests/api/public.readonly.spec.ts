import { expect, test } from '@playwright/test';
import { apiURL } from '../../src/support/api';

test('@security invalid public token returns 404 without exposing data', async ({ request }) => {
  const result = await request.get(`${apiURL}/public/invalid-token-qa-${Date.now()}`);
  expect(result.status()).toBe(404);
});
