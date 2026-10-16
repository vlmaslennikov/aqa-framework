#!/usr/bin/env node
/** Read-only environment diagnosis. Never prints credentials, tokens, secrets or signed URLs. */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv, localPg } from './sync-env.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const get = file => existsSync(join(ROOT,file)) ? parseEnv(readFileSync(join(ROOT,file),'utf8')) : {};
const root=get('.env'), ui=get('vdr-qa-starter/.env'), api=get('virtual-data-room-main/apps/api/test/.env.test');
const storage=get('vdr-qa-starter/.env.storage'), browser=get('.env.browser');
let warnings=0, errors=0;
function check(name, ok, detail='') {
  console.log(`[qa-doctor] ${ok ? 'OK' : 'MISSING'} ${name}${detail ? ' — '+detail : ''}`);
  if (!ok) warnings++;
}
function warn(message) { console.log('[qa-doctor] REVIEW '+message); warnings++; }
function bad(message) { console.error('[qa-doctor] ERROR '+message); errors++; }
const local = value => {try {const u=new URL(value);return u.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(u.hostname) && u.pathname==='/' && !u.search && !u.hash;}catch{return false;}};
check('root .env',existsSync(join(ROOT,'.env')),'canonical configuration');
check('read-only OWNER credentials',Boolean(ui.OWNER_EMAIL && ui.OWNER_PASSWORD),'from root .env; values never printed');
check('read-only WEB_BASE_URL / API_BASE_URL',Boolean(ui.WEB_BASE_URL && ui.API_BASE_URL),'remote demo is read-only');
check('local isolated QA PostgreSQL',localPg(api.DATABASE_URL||'') && localPg(api.DIRECT_URL||''));
check('local React API target',local(get('virtual-data-room-main/apps/web/.env.local').VITE_API_URL||''));
check('Chromium sandbox flag', ['0','1'].includes(browser.LHCI_CHROME_NO_SANDBOX));
if (browser.LHCI_CHROME_NO_SANDBOX==='1') warn('Chromium sandbox explicitly disabled; use only in trusted disposable environment.');
if (root.SUPABASE_URL && !root.QA_TEST_SUPABASE_URL) {
  warn('Root SUPABASE_URL is not copied to the local destructive QA stack. Supply QA_TEST_SUPABASE_URL for an isolated test project only.');
  try {if (new URL(root.SUPABASE_URL).pathname.includes('/storage/v1/s3')) warn('Supabase S3-compatible endpoint detected: verify SDK project URL format for the local backend.');} catch {};
}
if (root.SUPABASE_SERVICE_ROLE_KEY && !root.QA_TEST_SUPABASE_SERVICE_ROLE_KEY) {
  warn('Root Storage service key deliberately NOT copied into test API config.');
}
if (root.VITE_SUPABASE_ANON_KEY && !root.QA_VITE_SUPABASE_ANON_KEY) {
  warn('Frontend publishable key originates from root .env; verify it belongs to the intended local test Supabase project.');
}
if ((root.QA_STORAGE_E2E_ACK||'')==='DISPOSABLE_STORAGE_AND_DB_ONLY' &&
 (root.QA_STORAGE_TEST_BUCKET_ACK||'')==='I_VERIFIED_DISPOSABLE_BUCKET') {
  warn('Real Storage E2E acknowledgements are ENABLED; confirm actual running backend and bucket isolation before use.');
} else console.log('[qa-doctor] OK real Storage E2E disabled by default');
if (!local(storage.API_BASE_URL||'') || !local(storage.WEB_BASE_URL||'')) bad('Storage E2E origins must be loopback HTTP.');
if (root.LHCI_ALLOW_REMOTE==='1') warn('Lighthouse remote audit enabled (read-only); results apply only to selected routes.');
if (ui.LHCI_WEB_BASE_URL && root.LHCI_WEB_BASE_URL && ui.LHCI_WEB_BASE_URL!==root.LHCI_WEB_BASE_URL) bad('LHCI target differs between root and generated UI env. Rerun make env-sync.');
console.log(`[qa-doctor] ${errors} configuration error(s), ${warnings} review item(s). No network requests or mutations made.`);
if (errors) process.exitCode=2;
