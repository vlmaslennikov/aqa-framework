import test from 'node:test';
import assert from 'node:assert/strict';
import {collectInventory, compareInventories, formatResourceEnv, validateApiOrigin} from '../../scripts/inventory-core.mjs';
const ids={room:'10000000-0000-4000-8000-000000000001',folder:'10000000-0000-4000-8000-000000000002',file:'10000000-0000-4000-8000-000000000003'};
function mockApi({duplicate=false,noPdf=false,loop=false}={}) {
  const calls=[];
  const fetchImpl=async (url,opts) => {
    const path=new URL(url).pathname;
    calls.push({method:opts.method,path,query:new URL(url).searchParams});
    function ok(v) {return new Response(JSON.stringify(v),{status:200,headers:{'Content-Type':'application/json'}});}
    if(path==='/auth/login') return ok({accessToken:'TOP-SECRET-TOKEN'});
    if(opts.method!=='GET'||opts.headers.Authorization!=='Bearer TOP-SECRET-TOKEN') return new Response('',{status:401});
    if(path==='/data-rooms') return ok({items:[{id:ids.room,name:'My Data Room'}],nextCursor:null});
    if(path===`/data-rooms/${ids.room}/contents`) {
      const cursor=new URL(url).searchParams.get('cursor');
      if(!cursor) return ok({items:[{type:'folder',id:ids.folder,name:'1',parentId:null}],nextCursor:'next'});
      if(loop) return ok({items:[],nextCursor:'next'});
      return ok({items: noPdf ? [] : [
        {type:'file',id:ids.file,name:'Overview.pdf',size:3100,mimeType:'application/pdf'},
        ...(duplicate ? [{type:'file',id:'10000000-0000-4000-8000-000000000004',name:'Overview.pdf',size:3100,mimeType:'application/pdf'}] : [])],nextCursor:null});
    }
    if(path===`/folders/${ids.folder}/contents`) return ok({items:[],nextCursor:null});
    return new Response('',{status:404});
  };
  return {fetchImpl,calls};
}
const setup = {base:'https://virtual-data-room-production.up.railway.app',email:'owner@example.com',password:'dummy'};
test('read-only inventory discovers Overview.pdf in paginated room and empty folder',async () => {
 const mock=mockApi(); const v=await collectInventory({...setup,fetchImpl:mock.fetchImpl});
 assert.equal(v.counts.folders,1);assert.equal(v.counts.files,1);
 assert.equal(v.selected.LHCI_FILE_ID,ids.file);assert.equal(v.selected.LHCI_ROOM_ID,ids.room);
 assert.equal(v.selected.LHCI_FOLDER_ID,ids.folder);
 assert.equal(v.requestCount,5);
 assert.deepEqual(mock.calls.map(c=>c.method),['POST','GET','GET','GET','GET']);
 assert.match(formatResourceEnv(v.selected),/LHCI_FILE_ID=10000000-0000-4000-8000-000000000003/);
 assert.equal(JSON.stringify(v).includes('TOP-SECRET-TOKEN'),false);
});
test('does not select ambiguous file name',async()=>{
 const v=await collectInventory({...setup,fetchImpl:mockApi({duplicate:true}).fetchImpl});
 assert.equal(v.selected.LHCI_FILE_ID,null);assert.ok(v.warnings.some(w=>w.includes('ambiguous')));
});
test('missing PDF remains an explicit skip, not a fabricated ID',async()=>{
 const v=await collectInventory({...setup,fetchImpl:mockApi({noPdf:true}).fetchImpl});
 assert.equal(v.selected.LHCI_FILE_ID,null); assert.equal(v.counts.files,0);
});
test('detects repeat pagination cursor rather than writing partial result',async()=>{
 await assert.rejects(collectInventory({...setup,fetchImpl:mockApi({loop:true}).fetchImpl}),/cursor loop/);
});
test('rejects unknown remote API where credentials could leak',()=>{
 assert.equal(validateApiOrigin(setup.base),setup.base);
 assert.equal(validateApiOrigin('http://127.0.0.1:3000'),'http://127.0.0.1:3000');
 assert.throws(()=>validateApiOrigin('https://evil.example'),/Unknown remote/);
 assert.throws(()=>validateApiOrigin('https://trusted.example/user:pw'),/bare origin/);
 assert.equal(validateApiOrigin('https://staging.example',{QA_READONLY_ALLOW_REMOTE:'1',QA_API_APPROVED_ORIGIN:'https://staging.example'}),'https://staging.example');
});
test('diff distinguishes observed addition, removal and rename, without inferring deletion cause',()=>{
 const old={schemaVersion:1,source:setup.base,room:{id:ids.room},fetchedAt:'2026-10-15',items:[{id:ids.file,name:'Overview.pdf',type:'file'},{id:ids.folder,name:'1',type:'folder'}]};
 const now={...old,fetchedAt:'2026-10-16',items:[{id:ids.file,name:'New.pdf',type:'file'},{id:'10000000-0000-4000-8000-000000000005',name:'a',type:'folder'}]};
 const d=compareInventories(old,now);assert.deepEqual(d.summary,{added:1,removed:1,changed:1});
 assert.match(d.conclusion,/not established/);
});
test('diff refuses comparing unrelated rooms',()=>{
 const a={schemaVersion:1,source:setup.base,room:{id:ids.room},items:[]};
 assert.throws(()=>compareInventories(a,{...a,room:{id:ids.folder}}),/different/);
});
test('resource import fills empty .env IDs but preserves explicit ID',async()=>{
 const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {createRequire}=await import('node:module');
 const require=createRequire(import.meta.url);
 const {loadQaResourceIds}=require('../../scripts/qa-resource-env.cjs');
 const dir=mkdtempSync(join(tmpdir(),'vdr-qa-env-'));
 try {
  writeFileSync(join(dir,'.qa-resources.env'),formatResourceEnv({LHCI_ROOM_ID:ids.room,LHCI_FOLDER_ID:ids.folder,LHCI_FILE_ID:ids.file}));
  const env={LHCI_ROOM_ID:'',LHCI_FILE_ID:'10000000-0000-4000-8000-000000000009'};
  loadQaResourceIds(env,dir);
  assert.equal(env.LHCI_ROOM_ID,ids.room);
  assert.equal(env.LHCI_FOLDER_ID,ids.folder);
  assert.equal(env.LHCI_FILE_ID,'10000000-0000-4000-8000-000000000009');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
