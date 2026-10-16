import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,copyFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const top=resolve(fileURLToPath(new URL('../../..',import.meta.url)));
function fixture(fn) {
 const dir=mkdtempSync(join(tmpdir(),'vdr-bootstrap-'));
 try {copyFileSync(join(top,'Makefile'),join(dir,'Makefile')); fn(dir);}
 finally {rmSync(dir,{recursive:true,force:true});}
}
test('Make exports a valid Lighthouse sandbox default without local env files',()=>fixture(dir=>{
 const env={...process.env};delete env.LHCI_CHROME_NO_SANDBOX;
 const chrome=join(top,'vdr-qa-starter/lighthouse/chrome.cjs');
 writeFileSync(join(dir,'probe.cjs'),`console.log(JSON.stringify(require(${JSON.stringify(chrome)}).chromiumArgs()))`);
 const r=spawnSync('make',['--no-print-directory','--eval=audit:;@node probe.cjs','audit'],{cwd:dir,env,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim(),'[]');
}));
test('parallel setup orders Node before dependencies and web dependencies before Cypress verification',()=>fixture(dir=>{
 writeFileSync(join(dir,'probe.mk'),`
node-install:
	@sleep 0.1; touch node-ready
deps-api:
	@test -f node-ready
deps-web:
	@test -f node-ready; sleep 0.1; touch web-ready
deps-qa:
	@test -f node-ready
deps-cypress:
	@test -f web-ready
playwright-chromium:
	@test -f node-ready
playwright-ffmpeg:
	@test -f node-ready
playwright-install:
	@true
browser-deps:
	@true
k6-install:
	@true
env-sync:
	@true
qa-doctor:
	@true
`);
 const r=spawnSync('make',['-j8','--no-print-directory','-f','Makefile','-f','probe.mk','setup'],{cwd:dir,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
}));
test('Cypress receives the detected Playwright executable, including paths containing spaces',()=>fixture(dir=>{
 mkdirSync(join(dir,'web'));mkdirSync(join(dir,'bin'));
 const chrome=join(dir,'browser with spaces','chrome');
 const wrapper=join(dir,'wrapper.sh');
 writeFileSync(wrapper,`#!/bin/bash\nexport CHROMIUM_EXECUTABLE_PATH='${chrome}'\nexec "$@"\n`);
 writeFileSync(join(dir,'bin/npx'),'#!/bin/bash\nprintf "%s\\n" "$@"\n',{mode:0o755});
 const r=spawnSync('make',['--no-print-directory','test-cypress',`WEB=${join(dir,'web')}`,`NODE=${wrapper}`,`BROWSER=${wrapper}`],{
 cwd:dir,env:{...process.env,PATH:join(dir,'bin')+':'+process.env.PATH},encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const args=r.stdout.trim().split('\n');assert.equal(args[args.indexOf('--browser')+1],chrome);
}));

test('bootstrap never installs OS packages or invokes privilege elevation', async()=>{
 const {readFileSync}=await import('node:fs');
 const make=readFileSync(join(top,'Makefile'),'utf8');
 const script=readFileSync(join(top,'scripts/install-browser-deps.sh'),'utf8');
 assert.doesNotMatch(script,/\b(?:sudo|su|apt-get|apt|pkexec)\b|playwright install-deps/);
 assert.doesNotMatch(make,/^setup:.*browser-deps|^deps-cypress:.*browser-deps/m);
});

test('plain make setup plan contains no system-package installation or privilege elevation',()=>fixture(dir=>{
 const r=spawnSync('make',['-n','setup'],{cwd:dir,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 assert.doesNotMatch(r.stdout,/\b(?:sudo|pkexec|apt-get)\b|install-deps|--with-deps|install-browser-deps\.sh/);
 assert.match(r.stdout,/bootstrap v0\.13\.0/);
}));
