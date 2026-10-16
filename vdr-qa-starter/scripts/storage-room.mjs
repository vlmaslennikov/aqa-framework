const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The local app creates one owned room on account registration. Refuse to
// guess if the account owns multiple rooms or the response is incomplete.
export async function resolveStorageRoomId(request, apiBaseUrl, headers) {
  const response = await request.get(`${apiBaseUrl.replace(/\/$/, '')}/data-rooms?limit=2`, { headers });
  if (response.status() !== 200) {
    throw new Error(`Storage E2E could not list local rooms (HTTP ${response.status()}).`);
  }
  const page = await response.json();
  if (!Array.isArray(page.items) || page.items.length !== 1 || page.nextCursor !== null ||
      !UUID.test(page.items[0]?.id || '')) {
    throw new Error('Storage E2E needs exactly one owned room in the local QA account. Use a new local QA user.');
  }
  return page.items[0].id;
}
