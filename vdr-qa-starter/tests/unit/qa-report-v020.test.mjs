import test from 'node:test';
import assert from 'node:assert/strict';
import {renderReport, selectRuns} from '../../../scripts/qa-report.mjs';
const run=(scope,time,results=[])=>({scope,runId:time,startedAt:time,overall:'INCOMPLETE',sutSourceSha256:'abc',results});
const suite=(name,status,kind='PRODUCT')=>({name,status,lane:kind,counts:{passed:3,total:3,failed:0,skipped:0}});
test('dashboard with no manifests never claims a successful test',()=>{
 const report=renderReport([]);
 assert.match(report,/No valid local execution manifests found/);
 assert.match(report,/NOT RUN/);
 assert.match(report,/NOT ASSESSED FOR PRODUCTION APPROVAL/);
});
test('dashboard keeps known defects separated from product passes',()=>{
 const report=renderReport([run('local','2026-10-16T09:00:00Z',[suite('api-integration','PASS'),suite('known-boundaries','FINDINGS_REPRODUCED','KNOWN_FINDINGS'),suite('qa-framework','PASS','TOOLING')])]);
 assert.match(report,/QA-AUTH-06/);
 assert.match(report,/QA-FILE-02/);
 assert.match(report,/FINDINGS_REPRODUCED/);
 assert.match(report,/tooling.*not VDR behavior/i);
 assert.match(report,/real Storage SHA-256 E2E unverified/);
});
test('prefer coherent newest all-scope run, otherwise choose latest local and browser',()=>{
 const a=run('all','2026-10-16T10:00:00Z');const l=run('local','2026-10-16T09:00:00Z');const b=run('browser','2026-10-16T08:00:00Z');
 assert.deepEqual(selectRuns([a,l,b]),[a]);
 const newer=run('browser','2026-10-16T11:00:00Z');
 assert.deepEqual(selectRuns([newer,a,l]),[l,newer]);
});
test('report warns when local/browser runs were from different source snapshots',()=>{
 const a=run('local','2026-10-16T08:00:00Z');const b=run('browser','2026-10-16T09:00:00Z'); b.sutSourceSha256='different';
 assert.match(renderReport([a,b]),/Different SUT source hashes/);
});
