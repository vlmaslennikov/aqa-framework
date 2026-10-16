/**
 * Run only with scripts/k6-run.mjs and a dedicated QA PostgreSQL-backed API.
 * This script performs POST /auth/login once in setup; measured traffic is GET-only.
 * /files/:id metadata is read but fake Storage download/view URLs are NOT requested.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { ACK, validateLocalTarget, validateProfile, profileOptions, chooseEndpoint } from './policy.js';

const PROFILE = __ENV.K6_PROFILE || 'smoke';
validateProfile(PROFILE, __ENV);
const BASE = validateLocalTarget(__ENV.K6_BASE_URL || '');
const ids = {
  roomId: __ENV.K6_ROOM_ID,
  folderId: __ENV.K6_FOLDER_ID,
  fileId: __ENV.K6_FILE_ID,
};
for (const [key, val] of Object.entries(ids)) {
  if (!/^[0-9a-f-]{36}$/i.test(val || '')) throw new Error(`Missing or invalid ${key}; run qa:perf:seed`);
}
if (!__ENV.K6_PERF_EMAIL || !__ENV.K6_PERF_PASSWORD) throw new Error('Missing isolated performance account');

export const options = profileOptions(PROFILE);
const errors = new Rate('qa_contract_errors');
const patterns = {
  'health': '/health',
  'rooms': '/data-rooms?limit=20',
  'room-contents': `/data-rooms/${ids.roomId}/contents?limit=20`,
  'room-page-2': `/data-rooms/${ids.roomId}/contents?limit=20`,
  'folder-contents': `/folders/${ids.folderId}/contents?limit=20`,
  'folder-page-2': `/folders/${ids.folderId}/contents?limit=20`,
  'breadcrumbs': `/folders/${ids.folderId}/breadcrumbs`,
  'file-metadata': `/files/${ids.fileId}`,
};

export function setup() {
  const health = http.get(`${BASE}/health`, { redirects: 0, tags: { name: 'preflight-health' } });
  if (health.status !== 200 || health.json('status') !== 'ok') throw new Error('QA backend health preflight failed');
  const login = http.post(`${BASE}/auth/login`, JSON.stringify({ email: __ENV.K6_PERF_EMAIL, password: __ENV.K6_PERF_PASSWORD }), {
    headers: { 'Content-Type': 'application/json' }, redirects: 0,
    tags: { name: 'qa-one-time-login' },
  });
  if (login.status !== 200) throw new Error('Isolated QA login failed; check backend environment and seed');
  const token = login.json('accessToken');
  if (typeof token !== 'string' || token.length < 20) throw new Error('QA login did not return a JWT');
  const probe = http.get(`${BASE}/data-rooms/${ids.roomId}`, {
    headers: { Authorization: `Bearer ${token}` }, redirects: 0,
    tags: { name: 'preflight-room' },
  });
  if (probe.status !== 200 || probe.json('id') !== ids.roomId) throw new Error('QA room identity check failed');
  const roomPage = http.get(`${BASE}${patterns['room-contents']}`, {
    headers: { Authorization: `Bearer ${token}` }, redirects: 0, tags: { name: 'preflight-room-page' },
  });
  const folderPage = http.get(`${BASE}${patterns['folder-contents']}`, {
    headers: { Authorization: `Bearer ${token}` }, redirects: 0, tags: { name: 'preflight-folder-page' },
  });
  if (roomPage.status !== 200 || folderPage.status !== 200) throw new Error('QA pagination preflight failed');
  return { token, roomCursor: roomPage.json('nextCursor'), folderCursor: folderPage.json('nextCursor') }; // no logging
}

export default function (data) {
  const kind = chooseEndpoint(Math.random());
  let path = patterns[kind];
  if (kind === 'room-page-2') path = data.roomCursor
    ? `${path}&cursor=${encodeURIComponent(data.roomCursor)}` : patterns['room-contents'];
  if (kind === 'folder-page-2') path = data.folderCursor
    ? `${path}&cursor=${encodeURIComponent(data.folderCursor)}` : patterns['folder-contents'];
  const url = `${BASE}${path}`;
  const headers = kind === 'health' ? {} : { Authorization: `Bearer ${data.token}` };
  const r = http.get(url, { headers, redirects: 0, tags: { name: kind } });
  let valid = r.status === 200;
  if (valid) {
    try {
      const json = r.json();
      if (kind === 'health') valid = json && json.status === 'ok';
      else if (['rooms', 'room-contents', 'room-page-2', 'folder-contents', 'folder-page-2'].includes(kind)) valid = Array.isArray(json.items) && Object.prototype.hasOwnProperty.call(json, 'nextCursor');
      else if (kind === 'breadcrumbs') valid = Array.isArray(json.folders) && json.dataRoomId === ids.roomId;
      else valid = json && json.id === ids.fileId && json.mimeType === 'application/pdf';
    } catch (_) { valid = false; }
  }
  check(r, { [`${kind}: 200 + expected contract`]: () => valid });
  errors.add(!valid, { endpoint: kind });
  sleep(PROFILE === 'smoke' ? 0.3 : 0.2);
}
