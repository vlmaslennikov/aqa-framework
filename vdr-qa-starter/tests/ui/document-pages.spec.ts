import {expect, test} from '@playwright/test';
import {apiURL, bearer, credentials, login} from '../../src/support/api';

// Read-only flows against an already-existing, explicitly selected test resource.
// The user must supply real test object UUIDs; never create/mutate public demo data.
const UUID=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const owner=credentials('owner');
async function signIn(page: import('@playwright/test').Page) {
 await page.goto('/login');
 await page.getByLabel('Email').fill(owner!.email);
 await page.getByLabel('Password').fill(owner!.password);
 await page.getByRole('button',{name:/^Sign in$/}).click();
 await expect(page).toHaveURL(/\/$/);
}
for(const [kind,variable] of [['room','LHCI_ROOM_ID'],['folder','LHCI_FOLDER_ID']] as const){
 test(`@smoke ${kind} route loads an authorized test resource`,async ({page})=>{
  const id=process.env[variable];
  test.skip(!owner || !id,`Set OWNER_EMAIL/PASSWORD and ${variable} to run`);
  expect(id).toMatch(UUID);
  await signIn(page);
  await page.goto(`/${kind}/${id}`);
  await expect(page).toHaveURL(new RegExp(`/${kind}/${id}$`));
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByText(/could not load|not found/i)).toHaveCount(0);
 });
}
test('@smoke an authorized test PDF exposes inline preview and download',async ({page})=>{
 const id=process.env.LHCI_FILE_ID;
 test.skip(!owner || !id,'Set OWNER_EMAIL/PASSWORD and LHCI_FILE_ID to run');
 expect(id).toMatch(UUID);
 await signIn(page);
 await page.goto(`/file/${id}`);
 await expect(page).toHaveURL(new RegExp(`/file/${id}$`));
 await expect(page.getByRole('button',{name:/^Download$/})).toBeVisible();
 await expect(page.locator('main object[type="application/pdf"]')).toBeVisible({timeout:20000});
 await expect(page.getByText('Could not load this file for preview.')).toHaveCount(0);
});

// Read-only PDF byte verification on an existing explicitly selected fixture.
// Unlike the UI-object smoke, this checks the HTTP body. It does not prove
// that the document matches its original upload: that requires disposable E2E.
test('@smoke existing PDF download returns actual PDF bytes (not just a visible button)', async ({ request }) => {
  const id = process.env.LHCI_FILE_ID;
  test.skip(!owner || !id, 'Set OWNER_EMAIL/PASSWORD and LHCI_FILE_ID to run');
  expect(id).toMatch(UUID);
  const token = await login(request, owner!);
  const signed = await request.get(`${apiURL}/files/${id}/download-url`, {
    headers: bearer(token),
  });
  expect(signed.status(), 'Authenticated signed download should be issued').toBe(200);
  const { url } = await signed.json() as { url?: string };
  expect(url).toEqual(expect.any(String));
  const target = new URL(url!);
  expect(['https:', 'http:']).toContain(target.protocol);
  // Never print/log URL: query string may include a bearer-like Storage signature.
  const downloaded = await request.get(url!);
  expect(downloaded.status(), 'Signed URL should return PDF bytes').toBe(200);
  const body = await downloaded.body();
  expect(body.length).toBeGreaterThan(100);
  expect(body.subarray(0, 5).toString('ascii')).toBe('%PDF-');
});
