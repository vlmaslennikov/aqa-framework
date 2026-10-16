import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { apiURL, requireDisposableEnvironment } from '../../src/support/api';

test.describe('@mutation @regression registration input validation', () => {
  test.skip(!requireDisposableEnvironment(), 'Only approved disposable environment');
  test('QA-AUTH-06: a whitespace-only display name must be rejected', async ({ request }) => {
    const result = await request.post(`${apiURL}/auth/register`, { data: {
      email: `qa-whitespace-${randomUUID()}@example.test`, password: `Test-${randomUUID()}`, name: '    ',
    } });
    expect(result.status(), 'Whitespace-only names must not create users').toBe(400);
  });
});
