import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { config, parse } from 'dotenv';
import { assertStorageE2eTarget } from './guard-storage.mjs';

const file = resolve('.env.storage');
if (!existsSync(file)) {
  console.error('[storage] Missing vdr-qa-starter/.env.storage. Run make env-storage, then fill local test credentials.');
  process.exit(2);
}
const loaded = config({ path: file, override: true });
if (loaded.error) throw loaded.error;
process.env.RUN_MUTATION_TESTS = '1';
assertStorageE2eTarget(process.env);
const backendEnvPath = resolve('../virtual-data-room-main/apps/api/test/.env.test');
const frontendEnvPath = resolve('../virtual-data-room-main/apps/web/.env.local');
if (!existsSync(backendEnvPath) || !existsSync(frontendEnvPath)) {
  throw new Error('Storage E2E requires generated backend and frontend QA env files (make env-sync).');
}
const backend = parse(readFileSync(backendEnvPath));
const frontend = parse(readFileSync(frontendEnvPath));
const db = new URL(backend.DATABASE_URL || '');
if (!['127.0.0.1','localhost','[::1]'].includes(db.hostname) ||
    decodeURIComponent(db.pathname) !== '/vdr_qa_test') {
  throw new Error('Storage E2E refuses backend env outside local vdr_qa_test.');
}
const supabase = new URL(backend.SUPABASE_URL || '');
if (supabase.protocol !== 'https:' || supabase.pathname !== '/' ||
    !supabase.hostname.endsWith('.supabase.co') ||
    supabase.hostname.includes('.storage.') || !backend.SUPABASE_BUCKET ||
    !backend.SUPABASE_SERVICE_ROLE_KEY || backend.SUPABASE_URL.includes('storage.invalid')) {
  throw new Error('Storage E2E requires isolated Supabase project URL https://<project-ref>.supabase.co (not /storage/v1/s3) and a dedicated bucket.');
}
if (!frontend.VITE_SUPABASE_ANON_KEY || !frontend.VITE_API_URL ||
    new URL(frontend.VITE_API_URL).hostname !== '127.0.0.1') {
  throw new Error('Storage E2E requires a nonempty local frontend anon key and local API URL.');
}
console.log('[storage] Offline configuration guard PASS. Verify the actual running backend uses these settings and the bucket is disposable.');
const result = spawnSync('bash', ['../scripts/qa-browser-exec.sh', 'npm', 'run', 'test:qa:storage'], {
  cwd: process.cwd(), env: process.env, stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
