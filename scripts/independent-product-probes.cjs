#!/usr/bin/env node
/**
 * Execute unmodified VDR service/component code with in-memory dependency stubs.
 * No database, credentials, browser or network are used. These are boundary
 * observations, NOT deployed-app reproductions and NOT security exploit tests.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const apiRoot = path.join(root, 'virtual-data-room-main/apps/api');
const webRoot = path.join(root, 'virtual-data-room-main/apps/web');
const tsRequire = createRequire(path.join(apiRoot, 'package.json'));
let ts;
try { ts = tsRequire('typescript'); }
catch {
  try { ts = require('typescript'); }
  catch { throw new Error('TypeScript missing: run make setup first. The probes do not fetch packages.'); }
}
const logDir = path.join(root, 'evidence', 'independent');

function loadSource(relativeFile, mocks, {jsx = false} = {}) {
  const file = path.join(root, relativeFile);
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true,
      emitDecoratorMetadata: false,
      jsx: jsx ? ts.JsxEmit.ReactJSX : undefined,
      esModuleInterop: true,
    }, fileName: file,
  }).outputText;
  const exports = {};
  const fakeRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === 'node:crypto') return require('node:crypto');
    throw new Error(`No external module permitted in isolated probe: ${name}`);
  };
  vm.runInNewContext(code, { exports, require: fakeRequire, console, Buffer, setTimeout }, {filename: file, timeout: 4000});
  const lines = source.split(/\r?\n/);
  return {
    exports,
    evidence: {path: relativeFile, sha256: crypto.createHash('sha256').update(source).digest('hex'), sourceLines: lines.length},
  };
}

const classes = new Proxy({}, {
  get(target, name) {
    if (name === 'Injectable') return () => ctor => ctor;
    return class extends Error { constructor(message) {super(message); this.name = String(name);}};
  },
});
const asyncAccess = async () => 'OWNER';
const fileDeps = {
  '@nestjs/common': classes,
  '@/common/access': {dataRoomScope: id => ({dataRoomId:id, chain:[]}), requireAccess:asyncAccess},
  '@/common/resolve-name': {resolveName: async (_prisma, _scope, name) => name},
  '@/common/name-lower': {toNameLower: name => name.toLowerCase()},
};
const fileSource = 'virtual-data-room-main/apps/api/src/files/files.service.ts';
const dialogSource = 'virtual-data-room-main/apps/web/src/features/data-room/components/delete-folder-dialog.tsx';
const observations = [];
async function probe(id, description, sourcePath, run, claim) {
  try {
    const {behaviorObserved, details} = await run();
    observations.push({id, description, source:sourcePath, evidenceType:'EXECUTED_UNMODIFIED_SOURCE_WITH_STUBBED_DEPENDENCIES',
      status: behaviorObserved ? 'REPRODUCED_AT_BOUNDARY' : 'NOT_REPRODUCED_AT_BOUNDARY',
      claim, details});
  } catch(error) {
    observations.push({id, description, source:sourcePath, status:'BLOCKED', evidenceType:'BOUNDARY_PROBE', error:error.message});
  }
}

async function main() {
  await probe('QA-FILE-02', 'Actual Storage size above max accepted on upload completion', fileSource, async () => {
    const updates=[];
    const prisma={file:{
      findUnique: async () => ({id:'qa-file',dataRoomId:'qa-room',storageKey:'test-key'}),
      update: async input => {updates.push(input);return {id:'qa-file'};},
    }};
    const {exports:{FilesService}} = loadSource(fileSource,fileDeps);
    const service=new FilesService(prisma,{getObjectInfo:async()=>({size:50*1024*1024+1})});
    let resolved=false;
    try {await service.completeUpload('owner','qa-file');resolved=true;} catch{}
    return {behaviorObserved: resolved && updates.length===1 && updates[0].data.size===50*1024*1024+1,
      details:{acceptedSize: updates[0]?.data?.size ?? null, requestCompleted:resolved}};
  }, 'Server-side completeUpload does not re-check MAX_FILE_SIZE; real bucket bypass not established.');

  await probe('QA-NEW-01','Failed signed-upload URL leaves pending file metadata and occupies name',fileSource,async()=>{
    const rows=[];const deletes=[];
    const prisma={file:{
      create:async ({data})=>{rows.push(data);return data;},
      delete:async args=>{deletes.push(args);rows.pop();},
    }};
    const {exports:{FilesService}} = loadSource(fileSource,fileDeps);
    const service=new FilesService(prisma,{createUploadUrl:async()=>{throw new Error('Signed upload URL unavailable');}});
    let failed=false;
    try {await service.createUploadIntent('owner',{dataRoomId:'qa-room',name:'confidential.pdf',size:1024,mimeType:'application/pdf'});} catch {failed=true;}
    return {behaviorObserved:failed && rows.length===1 && deletes.length===0 && rows[0].uploadedAt===null,
      details:{uploadIntentFailed:failed, pendingRowsRemain:rows.length, compensatingDeletes:deletes.length}};
  },'Storage sign-URL failure after DB insert leaves a pending row; persistence and user-visible impact require isolated DB/storage validation.');

  await probe('QA-NEW-02','Delete-folder confirmation remains actionable when preview request errors', dialogSource, async()=>{
    const jsx=(type,props)=>({type,props});
    let deleteInvocations=0;
    const uiMocks={
      'react/jsx-runtime': {jsx, jsxs:jsx, Fragment:Symbol('Fragment')},
      '@tanstack/react-query': {useQueryClient:()=>({invalidateQueries(){}}),useMutation:()=>({isPending:false,mutate(){deleteInvocations+=1;}})},
      sonner:{toast:{success(){},error(){}}},
      '@/components/ui/button':{Button:function Button(){}},
      '@/components/ui/dialog':Object.fromEntries(['Dialog','DialogContent','DialogDescription','DialogFooter','DialogHeader','DialogTitle'].map(k=>[k,function component(){}])),
      '@/lib/api':{getErrorMessage:()=>''},
      '@/lib/format':{formatBytes:n=>String(n)},
      '@/features/data-room/api':{deleteFolder:async()=>undefined},
      '@/features/data-room/hooks':{
        contentsKey:()=>[],foldersKeyPrefix:[],
        useDeletePreview:()=>({isPending:false,isError:true,isSuccess:false,isFetching:false}),
      },
    };
    const {exports:{DeleteFolderDialog}}=loadSource(dialogSource,uiMocks,{jsx:true});
    const tree=DeleteFolderDialog({folder:{id:'folder',name:'Test Folder'},dataRoomId:'room',listingFolderId:null,open:true,onOpenChange(){}});
    const matching=[];
    function walk(node){
      if (!node || typeof node!=='object')return;
      if(Array.isArray(node))return node.forEach(walk);
      if(node.props){
        if(node.type?.name==='Button' && node.props.children==='Delete')matching.push(node.props);
        walk(node.props.children);
      }
    }
    walk(tree);
    if(matching.length!==1)throw new Error(`Expected 1 Delete button, got ${matching.length}`);
    // Simulate the actual Button handler; mutation is a local stub, not an API request.
    if (matching[0].disabled===false && typeof matching[0].onClick==='function') matching[0].onClick();
    return {behaviorObserved:matching[0].disabled===false && deleteInvocations===1,
      details:{previewRequestFailed:true,deleteButtonDisabled:matching[0].disabled,deleteMutationCalledAfterClick:deleteInvocations===1}};
  },'The preview failure message is shown, but Delete is enabled. This checks the real React component logic with mocked hooks; browser interaction remains unverified.');

  const paths=[fileSource,dialogSource].map(f=>{const b=fs.readFileSync(path.join(root,f));return {path:f,sha256:crypto.createHash('sha256').update(b).digest('hex'),sourceLines:b.toString('utf8').split(/\r?\n/).length};});
  const output={schemaVersion:1,generatedAt:new Date().toISOString(),probeRuntime:process.version,
    sourceBasis:'SUT files included in user-supplied VDR archive; no network/external service invoked',
    claimsAreNotDeployedAppFindings:true,files:paths,observations};
  fs.mkdirSync(logDir,{recursive:true});
  fs.writeFileSync(path.join(logDir,'boundary-probes.json'),JSON.stringify(output,null,2)+'\n',{mode:0o600});
  for(const o of observations)console.log(`[product probe] ${o.id}: ${o.status} — ${o.description}`);
  console.log('Evidence: evidence/independent/boundary-probes.json');
  if(observations.some(x=>x.status==='BLOCKED'))process.exitCode=2;
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
