#!/usr/bin/env node
/** Consolidate real local/browser QA manifests; don't turn missing evidence into PASS. */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(ROOT,'reports','qa-runs');
const OUT = join(ROOT,'reports','product-qa');
function loadSummaries(root=BASE) {
  let files=[];
  try {files=readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>join(root,e.name,'summary.json'));} catch{return []}
  const summaries=[];
  for(const file of files){
    try {
      const o=JSON.parse(readFileSync(file,'utf8'));
      if(o.source==='LOCAL_EXECUTION_ONLY' && ['local','browser','all'].includes(o.scope) && Array.isArray(o.results) && o.runId && o.startedAt) summaries.push({...o,manifest:file});
    }catch{/* do not promote broken artifacts to evidence */}
  }
  return summaries.sort((a,b)=>String(b.startedAt).localeCompare(String(a.startedAt)));
}
export function selectRuns(summaries){
  // An `all` run is one coherent execution containing both scopes; do not silently
  // mix an older local pass with a new browser run if a newer all run exists.
  const all=summaries.find(s=>s.scope==='all');
  const local=summaries.find(s=>s.scope==='local');
  const browser=summaries.find(s=>s.scope==='browser');
  if(all && (!local || all.startedAt>=local.startedAt) && (!browser || all.startedAt>=browser.startedAt)) return [all];
  return [local,browser].filter(Boolean);
}
function fmt(c){return c ? `${c.passed}/${c.total}${c.failed?' ('+c.failed+' failed)':''}${c.skipped?' ('+c.skipped+' skipped)':''}`:'—';}
function loadIndependentBoundarySection() {
  const file=join(ROOT,'evidence','independent','boundary-probes.json');
  let manifest;
  try { manifest=JSON.parse(readFileSync(file,'utf8')); }
  catch {return ['**NOT RUN.** Execute `make qa-investigate` for reproducible primary source-boundary observations.'];}
  if(manifest.schemaVersion!==1 || !Array.isArray(manifest.observations))
    return ['**INVALID EVIDENCE FORMAT.** Source-boundary probes are not counted.'];
  const lines=[
    `Source-boundary probes: ${manifest.generatedAt} (Node ${manifest.probeRuntime}); these are NOT browser/DB/Supabase reproductions.`,
    '', '| Finding | Boundary result | What was executed |', '|---|---|---|',
  ];
  for(const obs of manifest.observations){
    const safe=x=>String(x??'').replace(/[|\n\r]/g,' ');
    lines.push(`| ${safe(obs.id)} | ${safe(obs.status)} | ${safe(obs.description)} |`);
  }
  lines.push('', 'Source fingerprints and unredacted boundary observations: `evidence/independent/boundary-probes.json`. The initial AI-authored findings register is not primary evidence. See `vdr-qa-starter/docs/PRIMARY-FINDINGS-v021.md`.');
  return lines;
}

export function renderReport(runs){
  const results=runs.flatMap(run=>run.results.map(r=>({...r,runId:run.runId,runScope:run.scope,sourceSnapshot:run.sutSourceSha256,startedAt:run.startedAt})));
  const map=new Map(results.map(r=>[r.name,r]));
  const required=['product-unit','qa-framework','qa-guards','known-boundaries','api-integration','pdf-lifecycle','requirements','sharing-matrix','cypress-components','playwright-api','playwright-ui'];
  const lines=[
    '# VDR Product QA — current evidence dashboard','',
    '**Source:** latest available real `qa-evidence` JSON manifests; generated without running product tests.',
    `**Generated:** ${new Date().toISOString()}`,'',
    '> This is not a blanket product PASS. The signed-Storage E2E, manual UX charters and preissued-URL revocation check are still not proven by these suites.','',
    '## Evidence provenance','',
  ];
  if(!runs.length) lines.push('**No valid local execution manifests found. All runtime results are NOT VERIFIED.**','');
  for(const r of runs)lines.push(`- ${r.scope.toUpperCase()}: ${r.startedAt}, overall **${r.overall}**, run ID \`${r.runId}\`, SUT SHA-256 \`${r.sutSourceSha256||'unknown'}\`.`);
  if(runs.length===2 && runs[0].sutSourceSha256 && runs[1].sutSourceSha256 && runs[0].sutSourceSha256!==runs[1].sutSourceSha256)lines.push('- **WARNING:** Different SUT source hashes: do not merge results into one product pass.');
  lines.push('', '## Test pyramid execution','', '| Suite | Kind | Evidence | Result |','|---|---|---|---|');
  for(const name of required){const r=map.get(name);lines.push(`| ${name} | ${r?.lane??(name==='qa-framework'||name==='qa-guards'?'TOOLING':name==='known-boundaries'?'KNOWN_FINDINGS':'PRODUCT')} | ${r?.status??'NOT RUN'} | ${fmt(r?.counts)} |`);}
  lines.push('', 'A green `qa-framework` or `qa-guards` test is evidence about *test tooling*, not VDR behavior. Product-unit tests were authored upstream.',
    'The `known-boundaries` suite **passing** means the unsafe behavior is **reproduced**, not fixed.','',
    '## Bugs / issues / hypotheses','',
    '| ID | Category | Priority | Verified meaning |','|---|---|---|---|',
    '| QA-AUTH-06 | Validation defect | P2 | Whitespace-only display name accepted; previous local HTTP returned 201 (expected 400). |',
    '| QA-FILE-02 | Server validation defect | Conditional P1 | Completion accepts mocked Storage size >50 MiB; no confirmed live Supabase bypass. |',
    '| QA-OPS-08 | Reliability risk / observable failure mode | Investigate P1 | Storage-delete failure can leave orphan object after DB deletion; repair policy unspecified. |',
    '| QA-SEC-01 | Confidentiality/policy risk | Investigate P1 | Already-issued signed URL after share revocation not independently exercised. |',
    '| QA-OPS-04 | Product lifecycle limitation | P2 / clarify | No automatic abandoned upload cleanup in reviewed source. |',
    '| QA-AUTH-05 | Authentication policy limitation | P2 / clarify | No individual 7-day JWT revocation in reviewed MVP. |',
    '',
    '**Status warning:** The first two defects are historically observed/reproduced at mocked or local HTTP boundary. A current known-boundaries result is '+(map.get('known-boundaries')?.status||'NOT RUN')+'. Do not describe source risks as confirmed deployed exploits.',
    '', '## Requirement → test → gap','',
    '| MVP requirement | Relevant tests | Current status / still missing |','|---|---|---|',
    `| Auth and owner isolation | API/Integration/Browser | ${[map.get('api-integration')?.status,map.get('playwright-api')?.status,map.get('playwright-ui')?.status].filter(Boolean).join(' / ')||'NOT RUN'}; display-name bug remains |`,
    `| Nested folders, breadcrumbs, rename, delete preview | requirements + browser | ${map.get('requirements')?.status??'NOT RUN'}; live deletion during Viewer navigation untested |`,
    `| PDF upload, view, download, rename, move, delete | PDF lifecycle + browser | ${map.get('pdf-lifecycle')?.status??'NOT RUN'}; real Storage SHA-256 E2E unverified |`,
    `| Multi-file drag-drop and per-file progress | Cypress component | ${map.get('cypress-components')?.status??'NOT RUN'}; multi-file end-to-end unverified |`,
    `| USER / PUBLIC_LINK sharing for all three scopes | sharing matrix | ${map.get('sharing-matrix')?.status??'NOT RUN'}; already-issued signed URL revocation unverified |`,
    '| UX/accessibility/error states | exploratory/Lighthouse | Limited historical observations only; keyboard/mobile/manual charters pending |',
    '| Data scaling to 100k | k6 (separate) | Not counted without actual workload metrics / test dataset context |',
    '', '## Unexecuted or policy-dependent high-value cases','',
    '1. Preissued signed URL before/after share revoke and after expiry (disposable storage only).',
    '2. Multi-file drag/drop (mixed success/failure), cancellation, retry and full SHA-256 from a browser upload.',
    '3. Owner deletes shared folder while Viewer actively browses it; verify warning, client state and no stale access.',
    '4. Storage-delete failure recovery and cleanup of abandoned upload intents.',
    '5. 50 MiB boundary via real disposable bucket; metadata vs actual bytes.',
    '6. Keyboard/mobile/error feedback exploratory sessions with screenshots and known build revision.',
    '', '## Independent source-boundary investigation (not product PASS)','',
    ...loadIndependentBoundarySection(),
    '', '## Release decision','',
    '**NOT ASSESSED FOR PRODUCTION APPROVAL.** A confidential due-diligence VDR needs evidence for the unverified confidentiality/Storage edge cases, and explicit acceptance of the policy limitations. This take-home QA project remains a partial but structured assessment.',
    '', '## AI assistance','',
    'AI assisted with risk decomposition, test code, framework setup, safety checks and report drafting. Actual execution evidence comes only from the linked run manifests/user logs; unrun automation is not counted as verified behavior.','',
  );
  return lines.join('\n');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  mkdirSync(OUT,{recursive:true});
  const runs=selectRuns(loadSummaries());
  writeFileSync(join(OUT,'latest.md'),renderReport(runs)+'\n',{mode:0o600});
  console.log(`[qa-report] ${runs.length} manifest(s) used. Result: reports/product-qa/latest.md`);
  if(runs.length===0)console.log('[qa-report] No execution evidence found. Run make qa-evidence-local and make qa-evidence-browser.');
}
