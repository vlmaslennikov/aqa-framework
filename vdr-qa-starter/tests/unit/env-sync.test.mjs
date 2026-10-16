import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const project=resolve(fileURLToPath(new URL('../../..',import.meta.url)));
const original=join(project,'scripts/sync-env.mjs');
function inTemporaryRoot(callback) {
  const dir=mkdtempSync(join(tmpdir(),'vdr-qa-env-sync-'));
  try {
    mkdirSync(join(dir,'scripts'));
    copyFileSync(original,join(dir,'scripts/sync-env.mjs'));
    const put=(rel,data)=>{const path=join(dir,rel);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,data);};
    const run=()=>spawnSync(process.execPath,[join(dir,'scripts/sync-env.mjs')],{cwd:dir,encoding:'utf8',env:{...process.env}});
    return callback({dir,put,run,get:r=>readFileSync(join(dir,r),'utf8')});
  } finally {rmSync(dir,{recursive:true,force:true});}
}
test('setup env generator creates six files from root .env and does not reveal credentials',()=>inTemporaryRoot(({dir,put,run,get})=>{
  put('.env',`OWNER_EMAIL=qa@example.test\nOWNER_PASSWORD="p#ass with spaces"\nQA_API_PORT=3115\nQA_ROOM_NAME="Test room"\nLHCI_CHROME_NO_SANDBOX=0\nDATABASE_URL=postgresql://production:secret@prod.db.example:5432/postgres\nJWT_SECRET=production_super_secret\nSUPABASE_SERVICE_ROLE_KEY=production_secret_role\n`);
  const result=run();assert.equal(result.status,0,result.stderr);
  for(const rel of ['vdr-qa-starter/.env','virtual-data-room-main/apps/api/test/.env.test','.env.k6','.env.browser','vdr-qa-starter/.env.storage','virtual-data-room-main/apps/web/.env.local']) {
    assert.ok(existsSync(join(dir,rel)),rel);
    assert.equal(statSync(join(dir,rel)).mode & 0o777,0o600,rel);
  }
  const ui=get('vdr-qa-starter/.env');
  assert.match(ui,/OWNER_EMAIL="qa@example.test"/);
  assert.match(ui,/OWNER_PASSWORD="p#ass with spaces"/);
  assert.match(ui,/QA_ROOM_NAME="Test room"/);
  assert.match(get('.env.k6'),/K6_BASE_URL=http:\/\/127\.0\.0\.1:3115/);
  assert.match(get('virtual-data-room-main/apps/web/.env.local'),/VITE_API_URL="http:\/\/127\.0\.0\.1:3115"/);
  const api=get('virtual-data-room-main/apps/api/test/.env.test');
  assert.match(api,/DATABASE_URL='postgresql:\/\/qa:qa_local_only@127\.0\.0\.1:54329\/vdr_qa_test'/);
  for(const leak of ['production_super_secret','production_secret_role','prod.db.example','p#ass with spaces']) {
    assert.ok(!result.stdout.includes(leak) && !result.stderr.includes(leak),`Log contains sensitive data`);
  }
  assert.ok(!api.includes('production_secret_role')&&!api.includes('prod.db.example'));
  assert.match(get('vdr-qa-starter/.env.storage'),/QA_STORAGE_E2E_ACK=""/);
}));
test('root values override older files while local-only custom QA DB credentials survive',()=>inTemporaryRoot(({put,run,get})=>{
  put('.env','OWNER_EMAIL=fresh@example.test\nOWNER_PASSWORD=new-password\n');
  put('vdr-qa-starter/.env','OWNER_EMAIL=old@example.test\nOWNER_PASSWORD=old-password\n');
  put('virtual-data-room-main/apps/api/test/.env.test',`DATABASE_URL='postgresql://custom:private@localhost:5555/vdr_qa_test'\nDIRECT_URL='postgresql://custom:private@localhost:5555/vdr_qa_test'\nJWT_SECRET='custom-local-secret'\n`);
  assert.equal(run().status,0);
  assert.match(get('vdr-qa-starter/.env'),/OWNER_EMAIL="fresh@example.test"/);
  assert.match(get('vdr-qa-starter/.env'),/OWNER_PASSWORD="new-password"/);
  assert.match(get('virtual-data-room-main/apps/api/test/.env.test'),/postgresql:\/\/custom:private@localhost:5555\/vdr_qa_test/);
  assert.match(get('virtual-data-room-main/apps/api/test/.env.test'),/JWT_SECRET='custom-local-secret'/);
}));
test('refuses QA_DATABASE_URL that targets production and leaves previous files unchanged',()=>inTemporaryRoot(({put,run,get})=>{
  put('.env','QA_DATABASE_URL=postgresql://user:password@production.example:5432/postgres\n');
  put('vdr-qa-starter/.env','ORIGINAL=unchanged\n');
  const result=run();assert.equal(result.status,2);assert.match(result.stderr,/Refusing non-local QA PostgreSQL/);
  assert.equal(get('vdr-qa-starter/.env'),'ORIGINAL=unchanged\n');
}));
test('does not allow real Storage without root confirmation and ignores old sample ACKs',()=>inTemporaryRoot(({put,run,get})=>{
  put('.env','QA_TEST_SUPABASE_URL=https://sandbox.supabase.co\nQA_TEST_SUPABASE_SERVICE_ROLE_KEY=qa-key\n');
  put('vdr-qa-starter/.env.storage','QA_STORAGE_E2E_ACK=DISPOSABLE_STORAGE_AND_DB_ONLY\nQA_STORAGE_TEST_BUCKET_ACK=I_VERIFIED_DISPOSABLE_BUCKET\n');
  const result=run();assert.equal(result.status,2);assert.match(result.stderr,/ACK is missing/);
  put('.env','QA_TEST_SUPABASE_URL=https://sandbox.supabase.co\nQA_TEST_SUPABASE_SERVICE_ROLE_KEY=qa-key\nQA_STORAGE_TEST_BUCKET_ACK=I_VERIFIED_DISPOSABLE_BUCKET\n');
  assert.equal(run().status,0);
  assert.match(get('vdr-qa-starter/.env.storage'),/QA_STORAGE_E2E_ACK=""/);
  assert.match(get('vdr-qa-starter/.env.storage'),/QA_STORAGE_TEST_BUCKET_ACK="I_VERIFIED_DISPOSABLE_BUCKET"/);
}));
test('works without root .env and does not invent OWNER credentials or Storage approval',()=>inTemporaryRoot(({run,get})=>{
  assert.equal(run().status,0);
  assert.match(get('vdr-qa-starter/.env'),/OWNER_PASSWORD=""/);
  assert.match(get('.env.browser'),/LHCI_CHROME_NO_SANDBOX=0/);
  assert.match(get('vdr-qa-starter/.env.storage'),/QA_STORAGE_TEST_BUCKET_ACK=""/);
}));
test('root Lighthouse target and remote authorization propagate to QA .env without browser paths',()=>inTemporaryRoot(({put,run,get})=>{
  put('.env','LHCI_WEB_BASE_URL=https://demo.example.test\nLHCI_ALLOW_REMOTE=1\nLHCI_RUNS=3\n');
  const r=run();assert.equal(r.status,0,r.stderr);
  const ui=get('vdr-qa-starter/.env');
  assert.match(ui,/LHCI_WEB_BASE_URL="https:\/\/demo\.example\.test"/);
  assert.match(ui,/LHCI_ALLOW_REMOTE="1"/);
  assert.match(ui,/LHCI_RUNS="3"/);
  assert.doesNotMatch(ui,/CHROME_PATH/);
}));
test('root remote Lighthouse target without explicit remote opt-in is refused',()=>inTemporaryRoot(({put,run})=>{
  put('.env','LHCI_WEB_BASE_URL=https://demo.example.test\nLHCI_ALLOW_REMOTE=0\n');
  const r=run();assert.equal(r.status,2);assert.match(r.stderr,/QA URL must be local/);
}));
