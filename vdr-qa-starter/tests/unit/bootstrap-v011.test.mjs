import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../..', import.meta.url)));
const top=resolve(root,'..');
const run=(script,env={},cwd=root)=>spawnSync(process.execPath,[script],{cwd,env:{...process.env,...env},encoding:'utf8'});
const load=(f)=>readFileSync(join(top,f),'utf8');
test('QA .env.example is a real dotenv template, not TypeScript source',()=>{
 const s=readFileSync(join(root,'.env.example'),'utf8');
 assert.match(s,/^OWNER_EMAIL=/m);assert.match(s,/^OWNER_PASSWORD=/m);
 assert.doesNotMatch(s,/import .*from|defineConfig/);
});
test('Make setup includes Playwright Chromium, FFmpeg and version-pinned nvm',()=>{
 const s=load('Makefile');
 assert.match(s,/setup: node-install deps playwright-install k6-install/);
 assert.match(s,/playwright-install: playwright-chromium playwright-ffmpeg/);
 assert.match(s,/test-ui: env-sync\n\t@cd.*ui-preflight/);
 assert.match(s,/RUN_MUTATION_TESTS=0 bash "\$\(BROWSER\)" npm --prefix "\$\(QA\)" run test:ui/);
 assert.match(s,/make qa-discover|qa-discover:/);
 assert.match(load('scripts/with-node22.sh'),/nvm\.sh" --no-use/);
 assert.match(load('scripts/install-node22.sh'),/nvm\.sh" --no-use/);
 assert.match(load('scripts/install-node22.sh'),/nvm version "\$VERSION"/);
 assert.equal(load('.nvmrc').trim(),'22.16.0');
});
test('Playwright mutation files ignored at collection without opt-in',()=>{
 const config=readFileSync(join(root,'playwright.config.ts'),'utf8');
 assert.match(config,/testIgnore: mutationsEnabled \? \[\] : \['\*\*\/\*\.mutation\.spec\.ts'\]/);
 assert.doesNotMatch(load('vdr-qa-starter/scripts/guard-storage.mjs'),/import\.meta\.url ===/);
});
test('Cypress fixes and Vite alias are preserved',()=>{
 assert.ok(existsSync(join(top,'virtual-data-room-main/apps/web/cypress/support/component-index.html')));
 assert.match(load('virtual-data-room-main/apps/web/vite.config.ts'),/import \{ fileURLToPath \} from 'node:url'/);
});
test('browser wrapper derives both paths from Playwright and overrides stale env',()=>{
 const s=load('scripts/qa-browser-exec.sh');
 assert.match(s,/require\("@playwright\/test"\)\.chromium\.executablePath\(\)/);
 assert.match(s,/export CHROME_PATH/);
 assert.match(s,/export CHROMIUM_EXECUTABLE_PATH/);
});
test('UI preflight fails without credentials (no misleading 5 skipped)',()=>{
 const tmp=mkdtempSync(join(tmpdir(),'vdr-ui-preflight-'));
 try {
  mkdirSync(join(tmp,'scripts'));
  for(const name of ['ui-preflight.mjs','qa-resource-env.cjs']) copyFileSync(join(root,'scripts',name),join(tmp,'scripts',name));
  const p=run('scripts/ui-preflight.mjs',{OWNER_EMAIL:'',OWNER_PASSWORD:''},tmp);
  assert.equal(p.status,2);assert.match(p.stderr,/OWNER_EMAIL.*OWNER_PASSWORD/);
 } finally{rmSync(tmp,{recursive:true,force:true});}
});
test('Lighthouse isolated unit test explicitly disables sandbox exception',()=>{
 const s=readFileSync(join(root,'tests/unit/lighthouse.test.mjs'),'utf8');
 assert.match(s,/LHCI_ALLOW_REMOTE:'0',LHCI_CHROME_NO_SANDBOX:'0'/);
});

test('UI preflight auto-discovers all three resource IDs using read-only mock API', async()=>{
 const {createServer}=await import('node:http');
 const {spawn}=await import('node:child_process');
 const dir=mkdtempSync(join(tmpdir(),'vdr-ui-discovery-'));
 const ROOM='10000000-0000-4000-8000-000000000001';
 const FOLDER='10000000-0000-4000-8000-000000000002';
 const FILE='10000000-0000-4000-8000-000000000003';
 let mutations=0;
 const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  let value;
  if(req.method==='POST' && url.pathname==='/auth/login') value={accessToken:'mock'};
  else if(req.method!=='GET') mutations++;
  else if(req.headers.authorization==='Bearer mock') {
    if(url.pathname==='/data-rooms') value={items:[{id:ROOM,name:'My Data Room'}],nextCursor:null};
    if(url.pathname===`/data-rooms/${ROOM}/contents`) value={items:[
      {type:'folder',name:'QA Folder',id:FOLDER},
      {type:'file',name:'Overview.pdf',id:FILE,size:123,mimeType:'application/pdf'},
    ],nextCursor:null};
    if(url.pathname===`/folders/${FOLDER}/contents`) value={items:[],nextCursor:null};
  }
  res.writeHead(value ? 200 : 400, {'Content-Type':'application/json'});
  res.end(JSON.stringify(value||{error:'unexpected route'}));
 });
 try{
  mkdirSync(join(dir,'scripts'));
  for(const name of ['ui-preflight.mjs','qa-resource-env.cjs','qa-inventory.mjs','inventory-core.mjs']) {
    copyFileSync(join(root,'scripts',name),join(dir,'scripts',name));
  }
  await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
  const env={...process.env,OWNER_EMAIL:'qa@example.test',OWNER_PASSWORD:'mock-pw',
    API_BASE_URL:`http://127.0.0.1:${server.address().port}`,
    LHCI_ROOM_ID:'', LHCI_FOLDER_ID:'',LHCI_FILE_ID:'',QA_ROOM_ID:'',QA_UI_AUTO_DISCOVER:'1'};
  const result=await new Promise((resolveRun,reject)=>{
    const child=spawn(process.execPath,['scripts/ui-preflight.mjs'],{cwd:dir,env,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);
    child.on('error',reject);child.on('close',code=>resolveRun({code,stdout,stderr}));
  });
  assert.equal(result.code,0,result.stderr);
  assert.match(result.stdout,/All credentials and room\/folder\/PDF IDs present/);
  assert.equal(mutations,0);
  const ids=readFileSync(join(dir,'.qa-resources.env'),'utf8');
  for(const id of [ROOM,FOLDER,FILE]) assert.ok(ids.includes(id));
 } finally{
  server.close();rmSync(dir,{recursive:true,force:true});
 }
});
