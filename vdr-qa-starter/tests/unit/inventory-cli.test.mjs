import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const ROOM='10000000-0000-4000-8000-000000000001';
const FILE='10000000-0000-4000-8000-000000000003';
const root=resolve(import.meta.dirname,'../..');
function run(script,args,cwd,env){return new Promise((resolveRun,reject)=>{
 const p=spawn(process.execPath,[script,...args],{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';p.stdout.on('data',x=>stdout+=x);p.stderr.on('data',x=>stderr+=x);
 p.on('error',reject);p.on('close',code=>resolveRun({code,stdout,stderr}));
});}
test('CLI discovery -> snapshot baseline -> diff via mock HTTP, no data mutation', async()=>{
 const tmp=mkdtempSync(join(tmpdir(),'vdr-readonly-cli-'));
 const server=createServer(async (req,res)=>{
  let value;const url=new URL(req.url,'http://127.0.0.1');
  if(req.method==='POST'&&url.pathname==='/auth/login') value={accessToken:'secret-test-token'};
  else if(req.method==='GET'&&req.headers.authorization==='Bearer secret-test-token') {
   if(url.pathname==='/data-rooms') value={items:[{id:ROOM,name:'My Data Room'}],nextCursor:null};
   else if(url.pathname===`/data-rooms/${ROOM}/contents`) value={items:[{id:FILE,name:'Overview.pdf',type:'file',size:3000,mimeType:'application/pdf'}],nextCursor:null};
  }
  if (!value){res.writeHead(405);res.end('Unexpected write or endpoint');return;}
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(value));
 });
 try {
  mkdirSync(join(tmp,'scripts'));
  for(const name of ['qa-inventory.mjs','inventory-core.mjs']) copyFileSync(join(root,'scripts',name),join(tmp,'scripts',name));
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const port=server.address().port;
  const env={API_BASE_URL:`http://127.0.0.1:${port}`,OWNER_EMAIL:'qa@example.com',OWNER_PASSWORD:'placeholder',QA_ROOM_NAME:'My Data Room',QA_FILE_NAME:'Overview.pdf'};
  const script=join(tmp,'scripts','qa-inventory.mjs');
  const a=await run(script,['discover'],tmp,env);
  assert.equal(a.code,0,a.stderr);
  assert.match(a.stdout,/folders=0, files=1/);
  assert.equal(existsSync(join(tmp,'.qa-resources.env')),true);
  assert.match(readFileSync(join(tmp,'.qa-resources.env'),'utf8'),new RegExp(`LHCI_FILE_ID=${FILE}`));
  assert.equal(readFileSync(join(tmp,'reports','inventory','latest.json'),'utf8').includes('secret-test-token'),false);
  const b=await run(script,['baseline'],tmp,env);
  assert.equal(b.code,0,b.stderr);
  const c=await run(script,['baseline'],tmp,env);
  assert.equal(c.code,1);assert.match(c.stderr,/Baseline already exists/);
  const d=await run(script,['diff'],tmp,env);
  assert.equal(d.code,0,d.stderr);
  assert.match(d.stdout,/added=0 removed=0 changed=0/);
 } finally {
  server.close();rmSync(tmp,{recursive:true,force:true});
 }
});
