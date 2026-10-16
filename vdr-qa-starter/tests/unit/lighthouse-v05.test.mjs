import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const require = createRequire(import.meta.url);
const root=resolve(import.meta.dirname,'../..');
const {getAuditRoutes}=require('../../lighthouse/routes.cjs');
const uuid='550e8400-e29b-41d4-a716-446655440000';
const localhost='http://127.0.0.1:4173';
test('authenticated targets include only opted-in room/folder/file',()=>{
 assert.deepEqual(getAuditRoutes('auth',{}),['/','/shared-with-me']);
 assert.deepEqual(getAuditRoutes('auth',{LHCI_ROOM_ID:uuid,LHCI_FILE_ID:uuid}),['/','/shared-with-me',`/room/${uuid}`,`/file/${uuid}`]);
 assert.deepEqual(getAuditRoutes('public',{LHCI_FILE_ID:uuid}),['/login','/register']);
});
test('malformed IDs and shared tokens are forbidden',()=>{
 for(const bad of ['hi','../login','abc?token=secret','Bearer abc','a'.repeat(36)]){
  assert.throws(()=>getAuditRoutes('auth',{LHCI_FILE_ID:bad}),/UUID/);
 }
 assert.throws(()=>getAuditRoutes('unknown',{}),/Unsupported/);
});
test('LHCI config uses relative puppeteer script and no ignored auth chromeFlags',()=>{
 const r=spawnSync(process.execPath,['-e',`const x=require('./lighthouse/config.cjs').ci.collect;console.log(JSON.stringify({script:x.puppeteerScript, flags:x.settings.chromeFlags, args:x.puppeteerLaunchOptions.args,urls:x.url}))`],{
  cwd:root,encoding:'utf8',env:{...process.env, LHCI_MODE:'auth',LHCI_WEB_BASE_URL:localhost, LHCI_CHROME_NO_SANDBOX:'1',OWNER_EMAIL:'qa@example.invalid',OWNER_PASSWORD:'dummy',LHCI_FILE_ID:uuid}});
 assert.equal(r.status,0,r.stderr);
 const j=JSON.parse(r.stdout);
 assert.equal(j.script,'lighthouse/login.cjs');
 assert.equal(j.flags,undefined);
 assert.ok(j.args.includes('--no-sandbox'));
 assert.ok(j.urls.includes(`${localhost}/file/${uuid}`));
});
test('route verification fails if an expected repeat is missing',()=>{
 const dir=mkdtempSync(join(tmpdir(),'vdr-v05-lhr-'));
 const input=join(dir,'raw');const out=join(dir,'out');mkdirSync(input);
 try {
  for(const [i,route] of ['/','/shared-with-me'].entries()){
    writeFileSync(join(input,`lhr-${i}.json`),JSON.stringify({requestedUrl:`${localhost}${route}`,finalDisplayedUrl:`${localhost}${route}`,categories:{performance:{score:1}},audits:{}}));
  }
  const args={cwd:root,encoding:'utf8',env:{...process.env,LHCI_DATA_DIR:input,LHCI_REPORT_BASE_DIR:out,LHCI_RUNS:'3'}};
  const fail=spawnSync(process.execPath,['scripts/lighthouse-verify.mjs','auth'],args);
  assert.equal(fail.status,1,fail.stderr);
  assert.match(fail.stderr,/Expected 3 LHRs/);
  const ok=spawnSync(process.execPath,['scripts/lighthouse-verify.mjs','auth'],{...args,env:{...args.env,LHCI_RUNS:'1'}});
  assert.equal(ok.status,0,ok.stderr);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
test('offline Lighthouse analyzer prints measured medians',()=>{
 const p=resolve(root,'evidence/lighthouse-auth-user-run-2026-10-16.json');
 const r=spawnSync(process.execPath,['scripts/lighthouse-analyze.mjs',p],{cwd:root,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 assert.match(r.stdout,/97\/100/);
 assert.match(r.stdout,/99\/100/);
 assert.match(r.stdout,/2\.007 s/);
 assert.match(r.stdout,/1\.923 s/);
});
