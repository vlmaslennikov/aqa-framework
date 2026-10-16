import test from 'node:test';
import assert from 'node:assert/strict';
import { assertStorageE2eTarget } from '../../scripts/guard-storage.mjs';
import { resolveStorageRoomId } from '../../scripts/storage-room.mjs';
const safe = {
  RUN_MUTATION_TESTS: '1',
  QA_STORAGE_E2E_ACK: 'DISPOSABLE_STORAGE_AND_DB_ONLY',
  QA_STORAGE_TEST_BUCKET_ACK: 'I_VERIFIED_DISPOSABLE_BUCKET',
  WEB_BASE_URL: 'http://127.0.0.1:5173/',
  API_BASE_URL: 'http://127.0.0.1:3000/',
  QA_E2E_ROOM_ID: '7d08988e-f5f6-4458-ac0a-5814291dbeb0',
  OWNER_EMAIL: 'qa@example.test',
  OWNER_PASSWORD: 'local',
};
test('storage E2E guard permits explicitly acknowledged loopback-only QA', () => {
  assert.equal(assertStorageE2eTarget(safe), true);
});
test('storage E2E guard rejects disabled mutation opt-in', () => {
  assert.throws(() => assertStorageE2eTarget({ ...safe, RUN_MUTATION_TESTS: '0' }));
});
test('storage E2E guard rejects public frontend', () => {
  assert.throws(() => assertStorageE2eTarget({ ...safe, WEB_BASE_URL: 'https://virtual-data-room-ten.vercel.app/' }));
});
test('storage E2E guard rejects public backend', () => {
  assert.throws(() => assertStorageE2eTarget({ ...safe, API_BASE_URL: 'https://virtual-data-room-production.up.railway.app/' }));
});
test('storage E2E guard rejects missing bucket confirmation', () => {
  const { QA_STORAGE_TEST_BUCKET_ACK: _, ...missing } = safe;
  assert.throws(() => assertStorageE2eTarget(missing));
});
test('storage E2E guard allows automatic room selection for a local QA user', () => {
  const { QA_E2E_ROOM_ID: _, ...automatic } = safe;
  assert.equal(assertStorageE2eTarget(automatic), true);
});
test('storage E2E guard rejects malformed explicit room ID', () => {
  assert.throws(() => assertStorageE2eTarget({ ...safe, QA_E2E_ROOM_ID: 'not-a-uuid' }));
});
test('storage E2E selects exactly one room owned by the local QA user', async () => {
  const request = { get: async () => ({ status: () => 200, json: async () => ({
    items: [{ id: safe.QA_E2E_ROOM_ID, name: 'My Data Room' }], nextCursor: null,
  }) }) };
  assert.equal(await resolveStorageRoomId(request, safe.API_BASE_URL, { Authorization: 'Bearer local' }), safe.QA_E2E_ROOM_ID);
});
test('storage E2E refuses ambiguous local rooms', async () => {
  const request = { get: async () => ({ status: () => 200, json: async () => ({
    items: [{ id: safe.QA_E2E_ROOM_ID }, { id: '489d6105-bd1d-4ca9-8742-893ad9948176' }], nextCursor: null,
  }) }) };
  await assert.rejects(resolveStorageRoomId(request, safe.API_BASE_URL, {}), /exactly one owned room/);
});
test('storage E2E guard rejects embedded credentials and non-root paths', () => {
  assert.throws(() => assertStorageE2eTarget({ ...safe, API_BASE_URL: 'http://qa:pw@localhost:3000/' }));
  assert.throws(() => assertStorageE2eTarget({ ...safe, API_BASE_URL: 'http://localhost:3000/api' }));
});
