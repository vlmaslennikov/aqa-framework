import { expect, test } from '@playwright/test';
import { credentials } from '../../src/support/api';

const owner = credentials('owner');

test('@smoke sign-in journey opens authenticated room', async ({ page }) => {
  test.skip(!owner, 'Supply OWNER_EMAIL and OWNER_PASSWORD in .env');
  await page.goto('/login');
  await page.getByLabel('Email').fill(owner!.email);
  await page.getByLabel('Password').fill(owner!.password);
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: /^Sign in$/ })).toHaveCount(0);
});

test('@security sign-in rejects invalid credentials without navigating', async ({ page }) => {
  test.skip(!owner, 'Supply OWNER_EMAIL and OWNER_PASSWORD in .env');
  await page.goto('/login');
  await page.getByLabel('Email').fill(owner!.email);
  await page.getByLabel('Password').fill('invalid-credential-' + Date.now());
  const loginResponse = page.waitForResponse(response =>
    response.url().includes('/auth/login') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  const response = await loginResponse;
  expect(response.status()).toBe(401);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Invalid email or password')).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('dataroom_token'));
  expect(token).toBeNull();
});

test('@smoke blank sign-in shows field errors without submitting credentials', async ({ page }) => {
  await page.goto('/login');
  let loginRequests = 0;
  page.on('request', request => {
    if (request.url().includes('/auth/login') && request.method() === 'POST') loginRequests++;
  });
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  await expect(page.locator('#email-error')).toHaveText('Enter a valid email');
  await expect(page.locator('#password-error')).toHaveText('Enter your password');
  expect(loginRequests).toBe(0);
  await expect(page).toHaveURL(/\/login$/);
});
