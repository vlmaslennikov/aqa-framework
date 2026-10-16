#!/usr/bin/env node
// Optional Lighthouse User Flow. Run only against an approved app with test credentials.
// Snapshot: authenticated dashboard; Timespan: SPA navigation to "Shared with me";
// Snapshot: shared page. Timespan does NOT yield a navigation performance score / LCP.
import {createRequire} from 'node:module';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkChrome} from './chrome-preflight.mjs';
const require = createRequire(import.meta.url);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
try {require('dotenv').config({path:resolve(root,'.env')});} catch {/* use shell env */}
const {getTarget, assertSafeTarget} = require('../lighthouse/target.cjs');
const {chromiumArgs} = require('../lighthouse/chrome.cjs');
const env = {...process.env, LHCI_MODE:'auth'};
let target, launchArgs;
try { target = getTarget(env); assertSafeTarget(target,env); launchArgs = chromiumArgs(env); }
catch (e) {console.error(e.message);process.exit(2);}
const browserPreflight = checkChrome(env);
if (!browserPreflight.ok) {console.error('[lighthouse-flow]',browserPreflight.message);process.exit(4);}
console.log('[lighthouse-flow] Chromium headless preflight PASS');
let puppeteer, startFlow;
try {({default:puppeteer} = await import('puppeteer')); ({startFlow} = await import('lighthouse'));}
catch(e) { console.error('Install devDependencies first:',e.message); process.exit(3); }
const chrome = env.CHROME_PATH || env.CHROMIUM_EXECUTABLE_PATH;
if (launchArgs.length) console.warn('[lighthouse] Chromium sandbox explicitly disabled. Only audit trusted, approved QA pages.');
const browser = await puppeteer.launch({
  headless:true,
  ...(chrome ? {executablePath:chrome}:{}),
  args:['--disable-dev-shm-usage', ...launchArgs],
});
const page = await browser.newPage();
try {
  await page.goto(new URL('login', target).toString(), {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#email');
  await page.type('#email',env.OWNER_EMAIL);
  await page.type('#password',env.OWNER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => Boolean(localStorage.getItem('dataroom_token')), {timeout:30000});
  await page.waitForSelector('a[href="/shared-with-me"]', {timeout:30000});
  await page.waitForNetworkIdle({idleTime:500, timeout:20000});
  if (new URL(page.url()).pathname === '/login') throw new Error('Not signed in');
  const flow = await startFlow(page, {name:'VDR authenticated SPA navigation'});
  await flow.snapshot({stepName:'Dashboard: authenticated state'});
  await flow.startTimespan({stepName:'Navigate: My data rooms to Shared with me'});
  await page.click('a[href="/shared-with-me"]');
  await page.waitForFunction(() => location.pathname === '/shared-with-me', {timeout:15000});
  await page.waitForSelector('main h1', {timeout:15000});
  await page.waitForNetworkIdle({idleTime:500, timeout:20000});
  if ((await page.evaluate(() => document.body.textContent || '')).includes("Could not load what's been shared with you.")) throw new Error('Shared page did not load successfully');
  await flow.endTimespan();
  await flow.snapshot({stepName:'Shared with me: settled state'});
  const out = resolve(root,'reports/lighthouse/flow');
  mkdirSync(out,{recursive:true});
  writeFileSync(resolve(out,'vdr-flow.html'), await flow.generateReport());
  writeFileSync(resolve(out,'vdr-flow.json'), JSON.stringify(await flow.createFlowResult(),null,2));
  console.log('Flow PASS; reports/lighthouse/flow/vdr-flow.html and .json (PRIVATE)');
} catch(e) {console.error('Flow FAILED:',e.message);process.exitCode=1;}
finally {await browser.close();}
