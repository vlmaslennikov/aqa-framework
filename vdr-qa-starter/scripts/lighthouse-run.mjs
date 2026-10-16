#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkChrome} from './chrome-preflight.mjs';
const require = createRequire(import.meta.url);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
try {require('dotenv').config({path:resolve(root,'.env')});} catch {/* explicit env works */}
require('./qa-resource-env.cjs').loadQaResourceIds(process.env,root);
const {getTarget, assertSafeTarget} = require('../lighthouse/target.cjs');
const {chromiumArgs} = require('../lighthouse/chrome.cjs');
const {getAuditRoutes} = require('../lighthouse/routes.cjs');
const mode = process.argv[2] || 'check';
if (!['public','auth','check','browser'].includes(mode)) {
  console.error('Usage: node scripts/lighthouse-run.mjs [check|browser|public|auth]');
  process.exit(2);
}
const env = {...process.env, LHCI_MODE: mode === 'auth' ? 'auth' : 'public'};
const outputDir = resolve(root, 'reports', 'lighthouse', ['public','auth'].includes(mode) ? mode : 'public');
function status(stage, state, message) {
  mkdirSync(outputDir, {recursive:true});
  writeFileSync(resolve(outputDir, 'qa-status.json'), JSON.stringify({
    mode, stage, state, message, timestamp:new Date().toISOString(),
    note:'This is a QA runner status, NOT a product defect or Lighthouse score.'
  }, null, 2));
}
try {
  const url = getTarget(env);
  assertSafeTarget(url, env);
  chromiumArgs(env);
  getAuditRoutes(mode === 'auth' ? 'auth' : 'public', env);
  if (env.LHCI_RUNS && (!Number.isInteger(Number(env.LHCI_RUNS)) || Number(env.LHCI_RUNS) < 1 || Number(env.LHCI_RUNS) > 5)) {
    throw new Error('LHCI_RUNS must be integer from 1 to 5');
  }
  console.log(`[lighthouse] mode=${mode}, origin=${url}, chrome=${env.CHROME_PATH || env.CHROMIUM_EXECUTABLE_PATH || 'auto'}`);
} catch (e) {console.error('[lighthouse]',e.message); process.exit(2);}
if (mode === 'check') {
  try {
    const config = require('../lighthouse/config.cjs');
    console.log('Configuration OK:', config.ci.collect.url.join(', '));
  } catch(e) {console.error('[lighthouse]',e.message);process.exit(2);}
  process.exit(0);
}
if (['public','auth'].includes(mode)) {
  // Never present old artifacts as the result of a newly failed run.
  rmSync(resolve(root, '.lighthouseci'), {recursive:true, force:true});
  rmSync(outputDir, {recursive:true, force:true});
  status('initialization','running','Started Lighthouse collection.');
}
const chrome = checkChrome(env);
if (!chrome.ok) {
  console.error(`[lighthouse] Browser startup failed: ${chrome.message}`);
  if (chrome.stderr) console.error(chrome.stderr);
  if (['public','auth'].includes(mode)) status('chromium-preflight','failed',chrome.message);
  process.exit(4);
}
console.log(`[lighthouse] Headless Chromium preflight: PASS (${chrome.chrome})`);
if (chrome.sandboxDisabled) {
  console.warn('[lighthouse] WARNING: Chrome sandbox is OFF. Use disposable isolated QA environments and approved targets only.');
}
if (mode === 'browser') process.exit(0);
const cli = resolve(root, 'node_modules', '.bin', 'lhci');
if (!existsSync(cli)) {
  console.error('LHCI missing. Install dependencies first: PUPPETEER_SKIP_DOWNLOAD=1 npm install');
  status('dependencies','failed','Missing @lhci/cli executable.');
  process.exit(3);
}
const result = spawnSync(cli, ['autorun', `--config=${resolve(root, 'lighthouse/config.cjs')}`], {
  cwd:root, env, stdio:'inherit'
});
if (result.error || result.status !== 0) {
  const detail = result.error?.message || `LHCI exited with ${result.status ?? 'signal'}. No audited pages are confirmed; inspect LHCI logs.`;
  console.error('[lighthouse]',detail);
  status('collection','failed',detail);
  process.exit(result.status || 1);
}
const verify = spawnSync(process.execPath, ['scripts/lighthouse-verify.mjs',mode],{cwd:root, env, stdio:'inherit'});
const verified = verify.status === 0;
status('route-verification', verified ? 'passed':'failed', verified
  ? 'Lighthouse collected LHRs and route verification completed.'
  : 'Route verification failed or generated no valid LHRs.');
process.exit(verify.status ?? 1);
