#!/usr/bin/env node
import {readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {getAuditRoutes} = require('../lighthouse/routes.cjs');
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const mode = process.argv[2] || process.env.LHCI_MODE || 'public';
if (!['public','auth'].includes(mode)) {console.error('mode must be public or auth'); process.exit(2);}
const lhciDir = process.env.LHCI_DATA_DIR ? resolve(process.env.LHCI_DATA_DIR) : resolve(root, '.lighthouseci');
const files = existsSync(lhciDir) ? readdirSync(lhciDir).filter(f => /^lhr-.*\.json$/.test(f)) : [];
if (!files.length) {console.error('No Lighthouse LHR JSON found in .lighthouseci; no verified run'); process.exit(2);}
function cleanUrl(s) {
  try {const u = new URL(s); return `${u.origin}${u.pathname}`; } catch {return 'invalid-url';}
}
const expected = getAuditRoutes(mode, process.env);
const expectedRunCount = Number(process.env.LHCI_RUNS || 3);
const counts = Object.fromEntries(expected.map(s => [s,0]));
const rows = [];
let failed = false;
for (const file of files) {
  let j;
  try {j = JSON.parse(readFileSync(join(lhciDir,file),'utf8'));}
  catch (e) {console.error('Unparseable LHR:',file); failed=true; continue;}
  const wanted = j.requestedUrl || j.initialUrl;
  const actual = j.finalDisplayedUrl || j.finalUrl;
  let ok = false;
  try {
    const w = new URL(wanted), a = new URL(actual);
    ok = w.origin === a.origin && w.pathname === a.pathname && w.search === a.search && expected.includes(w.pathname);
    if (ok) counts[w.pathname]++;
  } catch { /* invalid response */ }
  if (!ok || j.runtimeError) failed = true;
  rows.push({
    expected: cleanUrl(wanted), actual:cleanUrl(actual),
    correctRoute:ok, runtimeError: j.runtimeError?.code || null,
    scores:Object.fromEntries(['performance','accessibility','best-practices'].map(k=>[k,j.categories?.[k]?.score ?? null])),
    lcpMs:j.audits?.['largest-contentful-paint']?.numericValue ?? null,
    cls:j.audits?.['cumulative-layout-shift']?.numericValue ?? null,
    fcpMs:j.audits?.['first-contentful-paint']?.numericValue ?? null,
    tbtMs:j.audits?.['total-blocking-time']?.numericValue ?? null,
    speedIndexMs:j.audits?.['speed-index']?.numericValue ?? null
  });
}
for (const [route,count] of Object.entries(counts)) if (count !== expectedRunCount) {
  failed=true; console.error(`Expected ${expectedRunCount} LHRs for ${route}; received ${count}`);
}
const outputDir = process.env.LHCI_REPORT_BASE_DIR ? resolve(process.env.LHCI_REPORT_BASE_DIR,mode) : resolve(root,'reports/lighthouse',mode);
mkdirSync(outputDir,{recursive:true});
writeFileSync(join(outputDir,'qa-summary.json'),JSON.stringify({mode,expectedRunCount,runCount:rows.length,counts,rows,verified:!failed},null,2));
console.log(`Lighthouse ${mode}: ${rows.length} runs, route integrity ${failed?'FAIL':'PASS'}`);
console.log(`Summary: reports/lighthouse/${mode}/qa-summary.json`);
if (failed) process.exit(1);
