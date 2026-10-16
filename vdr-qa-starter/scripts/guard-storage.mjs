/** Explicit, FAIL-CLOSED guard for destructive browser-to-real-storage testing. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowed = new Set(['127.0.0.1', 'localhost', '[::1]']);
export function assertStorageE2eTarget(env = process.env) {
  if (env.RUN_MUTATION_TESTS !== '1' ||
      env.QA_STORAGE_E2E_ACK !== 'DISPOSABLE_STORAGE_AND_DB_ONLY') {
    throw new Error('Storage E2E blocked: RUN_MUTATION_TESTS=1 and QA_STORAGE_E2E_ACK=DISPOSABLE_STORAGE_AND_DB_ONLY required.');
  }
  const web = env.WEB_BASE_URL, api = env.API_BASE_URL;
  if (!web || !api) throw new Error('Storage E2E blocked: explicit WEB_BASE_URL and API_BASE_URL required.');
  for (const raw of [web, api]) {
    let u;
    try { u = new URL(raw); } catch { throw new Error('Storage E2E blocked: malformed base URL.'); }
    if (u.protocol !== 'http:' || !allowed.has(u.hostname) ||
        u.username || u.password || u.search || u.hash || u.pathname !== '/') {
      throw new Error('Storage E2E blocked: frontend and backend must use plain loopback HTTP origins ending in /.');
    }
  }
  if (env.QA_E2E_ROOM_ID && !UUID.test(env.QA_E2E_ROOM_ID)) {
    throw new Error('Storage E2E blocked: optional QA_E2E_ROOM_ID must be a valid UUID.');
  }
  if (!env.OWNER_EMAIL || !env.OWNER_PASSWORD ||
      env.QA_STORAGE_TEST_BUCKET_ACK !== 'I_VERIFIED_DISPOSABLE_BUCKET') {
    throw new Error('Storage E2E blocked: test credentials and QA_STORAGE_TEST_BUCKET_ACK required.');
  }
  return true;
}

if (process.argv[1] && /(?:^|[\\/])guard-storage\.mjs$/.test(process.argv[1])) {
  try {
    assertStorageE2eTarget();
    console.log('Storage E2E guard PASS: loopback origins and explicit acknowledgments; local room selected at test runtime.');
    console.log('Note: verify backend DATABASE_URL, SUPABASE_URL and SUPABASE_BUCKET manually: the guard cannot inspect a running server.');
  } catch (e) { console.error(String(e.message)); process.exitCode = 1; }
}
