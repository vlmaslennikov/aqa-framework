/** Exploratory charters with repeatable checkpoints. No remote writes or user-created data.
 * Simulated 410 response is explicitly a UX simulation, NOT proof of real token expiry. */
import { expect, test } from '@playwright/test';

test('@exploratory public invalid-link handling: no private contents are rendered', async ({ page }, testInfo) => {
  const bogusToken = `qa-invalid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await page.goto(`/share/${bogusToken}`);
  await expect(page.getByText('Link not available', { exact: true })).toBeVisible();
  await expect(page.getByText('This link is invalid or no longer available.')).toBeVisible();
  await testInfo.attach('invalid-public-link.png', { body: await page.screenshot(), contentType: 'image/png' });
});

test('@exploratory anonymous access to a private resource redirects to login', async ({ page }) => {
  await page.goto('/room/00000000-0000-4000-8000-000000000001');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: /^Sign in$/ })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('dataroom_token'))).toBeNull();
});

test('@exploratory mobile login empty-form validation does not make HTTP login attempt', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  let submitted = 0;
  page.on('request', req => { if (req.method() === 'POST' && req.url().includes('/auth/login')) submitted++; });
  await page.goto('/login');
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  await expect(page.locator('#email-error')).toHaveText('Enter a valid email');
  await expect(page.locator('#password-error')).toHaveText('Enter your password');
  expect(submitted).toBe(0);
  await testInfo.attach('mobile-login-validation.png', { body: await page.screenshot(), contentType: 'image/png' });
});

test('@exploratory MOCKED revocation status 410 renders the correct UX without retry', async ({ page }, testInfo) => {
  // This does not revoke a real share; it checks the browser's 410 handling in isolation.
  await page.route(/\/public\/qa-exploratory-revoked(?:\?.*)?$/, route => route.fulfill({
    status: 410, contentType: 'application/json', body: JSON.stringify({ statusCode: 410, message: 'Link revoked' }),
  }));
  await page.goto('/share/qa-exploratory-revoked');
  await expect(page.getByText('This link has been revoked', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);
  await testInfo.attach('mocked-revoked-link-ux.png', { body: await page.screenshot(), contentType: 'image/png' });
});
