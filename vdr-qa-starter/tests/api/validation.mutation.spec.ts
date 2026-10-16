import { expect, test } from '@playwright/test';
import { apiURL, bearer, credentials, login, requireDisposableEnvironment, type DataRoom, type PageResponse } from '../../src/support/api';

const owner = credentials('owner');
test.describe('@mutation @security negative API validation (MUTATION GUARDED)', () => {
  test.skip(!requireDisposableEnvironment(), 'Mutation scenarios require disposable environment');
  test.skip(!owner, 'Supply OWNER_EMAIL and OWNER_PASSWORD in .env');

  test('blank folder name is rejected', async ({ request }) => {
    const token = await login(request, owner!);
    const rooms = await request.get(`${apiURL}/data-rooms`, { headers: bearer(token) });
    expect(rooms.status()).toBe(200);
    const page = await rooms.json() as PageResponse<DataRoom>;
    test.skip(page.items.length === 0, 'An existing room is required');
    const response = await request.post(`${apiURL}/folders`, {
      headers: bearer(token), data: { dataRoomId: page.items[0].id, name: '   ' },
    });
    expect(response.status()).toBe(400);
  });

  test('declared upload larger than 50 MB is rejected', async ({ request }) => {
    const token = await login(request, owner!);
    const rooms = await request.get(`${apiURL}/data-rooms`, { headers: bearer(token) });
    expect(rooms.status()).toBe(200);
    const page = await rooms.json() as PageResponse<DataRoom>;
    test.skip(page.items.length === 0, 'An existing room is required');
    const response = await request.post(`${apiURL}/files/upload-intent`, {
      headers: bearer(token),
      data: { dataRoomId: page.items[0].id, name: 'too-large.pdf',
        size: 50 * 1024 * 1024 + 1, mimeType: 'application/pdf' },
    });
    expect(response.status()).toBe(400);
  });

  test('non-PDF MIME type is rejected before storage allocation', async ({ request }) => {
    const token = await login(request, owner!);
    const rooms = await request.get(`${apiURL}/data-rooms`, { headers: bearer(token) });
    expect(rooms.status()).toBe(200);
    const page = await rooms.json() as PageResponse<DataRoom>;
    test.skip(page.items.length === 0, 'An existing room is required');
    const response = await request.post(`${apiURL}/files/upload-intent`, {
      headers: bearer(token),
      data: { dataRoomId: page.items[0].id, name: 'not-a-pdf.txt', size: 10, mimeType: 'text/plain' },
    });
    expect(response.status()).toBe(400);
  });
});

