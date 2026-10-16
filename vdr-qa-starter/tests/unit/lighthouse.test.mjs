import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '../..');
const {getTarget,assertSafeTarget}=require('../../lighthouse/target.cjs');

test('default lighthouse target is loopback',()=> {
  const url=getTarget({}); assert.equal(url,'http://127.0.0.1:4173/');
  assert.equal(assertSafeTarget(url,{}),true);
});
test('reject remote targets without approval',()=> {
  assert.throws(()=>assertSafeTarget('https://virtual-data-room-ten.vercel.app/',{}),/blocked/);
});
test('reject URL containing embedded secrets, route, or query',()=> {
  for(const u of ['https://user:pass@example.com/','http://localhost:4173/?token=x','http://localhost:4173/share/token','http://localhost:4173/#x'])
    assert.throws(()=>getTarget({LHCI_WEB_BASE_URL:u}));
});
test('auth mode requires credentials',()=> {
  assert.throws(()=>assertSafeTarget('http://localhost:4173/',{LHCI_MODE:'auth'}),/requires/);
});
test('config check works without npm dependencies',()=> {
  const result=spawnSync(process.execPath,['scripts/lighthouse-run.mjs','check'], {cwd:root,env:{...process.env,LHCI_WEB_BASE_URL:'http://localhost:4173',LHCI_ALLOW_REMOTE:'0',LHCI_CHROME_NO_SANDBOX:'0'},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/Configuration OK/);
});
test('route-integrity verifier rejects redirect to login and accepts protected route',()=> {
  const base=mkdtempSync(join(tmpdir(),'vdr-lhci-test-'));
  const input=join(base,'lhrs'), reports=join(base,'reports'); mkdirSync(input);
  const make=(name,requested,final) => writeFileSync(join(input,`lhr-${name}.json`),JSON.stringify({requestedUrl:requested, finalDisplayedUrl:final, categories:{performance:{score:.9}}, audits:{}}));
  try {
    make('home','http://localhost:4173/','http://localhost:4173/login');
    make('shared','http://localhost:4173/shared-with-me','http://localhost:4173/shared-with-me');
    const env={...process.env,LHCI_DATA_DIR:input,LHCI_REPORT_BASE_DIR:reports,LHCI_RUNS:'1'};
    let r=spawnSync(process.execPath,['scripts/lighthouse-verify.mjs','auth'],{cwd:root,env,encoding:'utf8'});
    assert.equal(r.status,1);
    assert.equal(JSON.parse(readFileSync(join(reports,'auth/qa-summary.json'),'utf8')).verified,false);
    make('home','http://localhost:4173/','http://localhost:4173/');
    r=spawnSync(process.execPath,['scripts/lighthouse-verify.mjs','auth'],{cwd:root,env,encoding:'utf8'});
    assert.equal(r.status,0,r.stderr);
  } finally {rmSync(base,{recursive:true,force:true});}
});
test('no reports is an explicit failure, not a pass',()=> {
  const dir=mkdtempSync(join(tmpdir(),'lhci-empty-'));
  try {
    const r=spawnSync(process.execPath,['scripts/lighthouse-verify.mjs','public'],{cwd:root,env:{...process.env,LHCI_DATA_DIR:dir},encoding:'utf8'});
    assert.equal(r.status,2);
  } finally{rmSync(dir,{recursive:true,force:true});}
});

// v0.4.1: executable Chromium sandbox behavior and three independent launchers.
const {chmodSync} = await import('node:fs');
const {chromiumArgs,diagnoseChromeFailure}=require('../../lighthouse/chrome.cjs');
test('sandbox must be explicitly opted out of, never silently disabled',()=>{
  assert.deepEqual(chromiumArgs({}),[]);
  assert.deepEqual(chromiumArgs({LHCI_CHROME_NO_SANDBOX:'0'}),[]);
  assert.deepEqual(chromiumArgs({LHCI_CHROME_NO_SANDBOX:'1'}),['--no-sandbox','--disable-setuid-sandbox']);
  assert.throws(()=>chromiumArgs({LHCI_CHROME_NO_SANDBOX:'yes'}),/must be 0 or 1/);
});
test('both LHCI and Puppeteer authentication receive opt-in flags',()=>{
  for(const mode of ['public','auth']){
    const env={...process.env,LHCI_MODE:mode,LHCI_CHROME_NO_SANDBOX:'1',
      LHCI_WEB_BASE_URL:'http://127.0.0.1:4173',OWNER_EMAIL:'test@example.test',OWNER_PASSWORD:'fake'};
    const r=spawnSync(process.execPath,['-e','process.stdout.write(JSON.stringify(require("./lighthouse/config.cjs").ci.collect))'],
      {cwd:root,env,encoding:'utf8'});
    assert.equal(r.status,0,r.stderr);
    const config=JSON.parse(r.stdout);
    if (mode === 'public') assert.match(config.settings.chromeFlags,/--no-sandbox/);
    else assert.equal(config.settings.chromeFlags,undefined);
    if(mode==='auth') assert.ok(config.puppeteerLaunchOptions.args.includes('--no-sandbox'));
    else assert.equal(config.puppeteerLaunchOptions,undefined);
  }
});
test('browser preflight explains sandbox failure and opt-in makes it launch',()=>{
  const dir=mkdtempSync(join(tmpdir(),'vdr-fake-chrome-'));
  const bin=join(dir,'chrome');
  try {
    writeFileSync(bin, `#!/bin/sh\ncase " $* " in *" --no-sandbox "*) echo '<html><head></head><body></body></html>';; *) echo 'FATAL: No usable sandbox!' >&2; exit 1;; esac\n`);
    chmodSync(bin,0o755);
    const common={...process.env,CHROME_PATH:bin,LHCI_WEB_BASE_URL:'http://localhost:4173',LHCI_ALLOW_REMOTE:'0'};
    const fail=spawnSync(process.execPath,['scripts/lighthouse-run.mjs','browser'],
      {cwd:root,env:{...common,LHCI_CHROME_NO_SANDBOX:'0'},encoding:'utf8'});
    assert.equal(fail.status,4);
    assert.match(fail.stderr,/LHCI_CHROME_NO_SANDBOX=1/);
    const pass=spawnSync(process.execPath,['scripts/lighthouse-run.mjs','browser'],
      {cwd:root,env:{...common,LHCI_CHROME_NO_SANDBOX:'1'},encoding:'utf8'});
    assert.equal(pass.status,0,pass.stderr);
    assert.match(pass.stdout,/PASS/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('Chrome failure diagnosis distinguishes sandbox from missing library',()=>{
  assert.match(diagnoseChromeFailure('No usable sandbox!'),/LHCI_CHROME_NO_SANDBOX/);
  assert.match(diagnoseChromeFailure('error while loading shared libraries'),/shared libraries/);
});
