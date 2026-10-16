#!/usr/bin/env node
// A real headless Chrome launch check, not just `chrome --version`.
// No remote URLs are visited. Does not require Lighthouse npm dependencies.
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const require = createRequire(import.meta.url);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
try {require('dotenv').config({path: resolve(root, '.env')});} catch {/* manual shell export also works */}
const {chromiumArgs, diagnoseChromeFailure} = require('../lighthouse/chrome.cjs');

export function checkChrome(env = process.env) {
  let args;
  try {args = chromiumArgs(env);}
  catch (error) {return {ok:false, status:'invalid-config', message:error.message};}
  const chrome = env.CHROME_PATH || env.CHROMIUM_EXECUTABLE_PATH ||
    ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
  if (!chrome) {
    return {ok:false, status:'missing-binary', message:'Chrome executable not configured. Set CHROME_PATH to the extracted chrome-linux64/chrome executable.'};
  }
  if (!existsSync(chrome)) {
    return {ok:false, status:'missing-binary', message:`Chrome path does not exist: ${chrome}`};
  }
  const flags = ['--headless', '--disable-dev-shm-usage', '--disable-gpu', ...args, '--dump-dom', 'about:blank'];
  const r = spawnSync(chrome, flags, {encoding:'utf8', timeout:15000, maxBuffer:1024*1024});
  const diagnostics = String(r.stderr || '') + '\n' + String(r.error?.message || '');
  if (r.status !== 0 || r.error || !String(r.stdout || '').includes('<html')) {
    const detail = diagnoseChromeFailure(diagnostics);
    return {ok:false, status:'launch-failed', chrome, code:r.status, message:detail, stderr:diagnostics.slice(0,1600)};
  }
  return {ok:true, status:'pass', chrome, sandboxDisabled:args.length > 0};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkChrome();
  if (result.ok) {
    console.log(`[lighthouse] Chromium headless launch: PASS (${result.chrome})`);
    if (result.sandboxDisabled) {
      console.warn('[lighthouse] WARNING: --no-sandbox is enabled. Chromium renderer isolation is weakened. Use only for trusted, isolated QA targets.');
    }
  } else {
    console.error(`[lighthouse] Chromium preflight FAILED: ${result.message}`);
    if (result.stderr) console.error(result.stderr);
    process.exitCode = 4;
  }
}
