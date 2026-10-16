#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {collectInventory, compareInventories, formatResourceEnv, validateApiOrigin} from './inventory-core.mjs';
const require=createRequire(import.meta.url);
const root=resolve(fileURLToPath(new URL('..', import.meta.url)));
try {require('dotenv').config({path:resolve(root,'.env')});} catch (err) {if (err.code !== 'MODULE_NOT_FOUND') throw err;}
const out=resolve(root,'reports','inventory');
const latest=resolve(out,'latest.json');
const baseline=resolve(out,'baseline.json');
const resources=resolve(root,'.qa-resources.env');
const mode=process.argv[2] || 'discover';
const allowed=new Set(['discover','baseline','diff']);
if (!allowed.has(mode)) { console.error('Usage: node scripts/qa-inventory.mjs [discover|baseline|diff]');process.exit(2); }
try {
  if (mode==='discover') {
    const env=process.env;
    const base=validateApiOrigin(env.API_BASE_URL || 'https://virtual-data-room-production.up.railway.app',env);
    const data=await collectInventory({
      fetchImpl:fetch,base,email:env.OWNER_EMAIL,password:env.OWNER_PASSWORD,
      roomId:env.QA_ROOM_ID,roomName:env.QA_ROOM_NAME || 'My Data Room',
      fileName:env.QA_FILE_NAME || 'Overview.pdf',folderName:env.QA_FOLDER_NAME,
    });
    mkdirSync(out,{recursive:true});
    writeFileSync(latest,JSON.stringify(data,null,2)+'\n',{mode:0o600});
    writeFileSync(resources,formatResourceEnv(data.selected),{mode:0o600});
    console.log(`[qa:discover] room=${data.room.name}, folders=${data.counts.folders}, files=${data.counts.files}, requests=${data.requestCount}`);
    console.log(`[qa:discover] selected PDF=${data.selectedNames.file || 'NONE'}; folder=${data.selectedNames.folder || 'NONE'}`);
    for (const w of data.warnings) console.warn('[qa:discover] WARNING:',w);
    console.log('[qa:discover] reports/inventory/latest.json and .qa-resources.env saved (PRIVATE). No files modified on server.');
  } else if(mode==='baseline') {
    if (!existsSync(latest)) throw new Error('First run npm run qa:discover');
    if (existsSync(baseline) && process.env.QA_ALLOW_BASELINE_RESET!=='1') throw new Error('Baseline already exists. Refusing overwrite; set QA_ALLOW_BASELINE_RESET=1 only after reviewing history.');
    // Parse to reject accidental partial/invalid file from a failed collector.
    const v=JSON.parse(readFileSync(latest,'utf8'));
    if (v.schemaVersion!==1 || !Array.isArray(v.items)) throw new Error('Invalid inventory file');
    writeFileSync(baseline,JSON.stringify(v,null,2)+'\n',{mode:0o600});
    console.log(`[qa:baseline] Saved ${v.items.length} objects. Baseline does NOT establish what existed before QA testing.`);
  } else {
    if (!existsSync(baseline)||!existsSync(latest)) throw new Error('Missing baseline/latest; run qa:discover and qa:baseline first');
    const b=JSON.parse(readFileSync(baseline,'utf8'));
    const l=JSON.parse(readFileSync(latest,'utf8'));
    const diff=compareInventories(b,l);
    writeFileSync(resolve(out,'diff.json'),JSON.stringify(diff,null,2)+'\n',{mode:0o600});
    console.log(`[qa:diff] added=${diff.summary.added} removed=${diff.summary.removed} changed=${diff.summary.changed}. This is NOT proof of a defect.`);
  }
} catch(err) {
  console.error('[qa:inventory] FAILED:',err.message);
  process.exit(1);
}
