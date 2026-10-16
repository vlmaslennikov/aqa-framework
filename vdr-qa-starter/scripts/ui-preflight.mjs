#!/usr/bin/env node
/** Preflight for full read-only UI suite. No public demo data is modified. */
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..', import.meta.url)));
const require=createRequire(import.meta.url);
try {require('dotenv').config({path:resolve(root,'.env')});} catch(err) {
  if (err.code!=='MODULE_NOT_FOUND') throw err;
}
const {loadQaResourceIds}=require('./qa-resource-env.cjs');
const keys=['LHCI_ROOM_ID','LHCI_FOLDER_ID','LHCI_FILE_ID'];
const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const missing=()=>keys.filter(k=>!valid.test(process.env[k]||''));
if (!process.env.OWNER_EMAIL || !process.env.OWNER_PASSWORD) {
  console.error('[qa:ui] OWNER_EMAIL and OWNER_PASSWORD missing. Copy vdr-qa-starter/.env.example to .env and set credentials.');
  process.exit(2);
}
loadQaResourceIds(process.env,root);
if (missing().length) {
  if (process.env.QA_UI_AUTO_DISCOVER==='0') {
    console.error('[qa:ui] Missing resource IDs: '+missing().join(', ')+'. Run make qa-discover.');
    process.exit(2);
  }
  console.log('[qa:ui] Missing resource IDs: '+missing().join(', ')+'. Running read-only discovery...');
  const res=spawnSync(process.execPath,[resolve(root,'scripts/qa-inventory.mjs'),'discover'],{
    cwd:root,env:process.env,stdio:'inherit',timeout:60000,
  });
  if (res.error || res.status!==0) {
    console.error('[qa:ui] Discovery failed. Set QA_ROOM_ID/QA_FILE_NAME if default selection is ambiguous.');
    process.exit(res.status || 2);
  }
  loadQaResourceIds(process.env,root);
}
const absent=missing();
if (absent.length) {
  console.error('[qa:ui] Cannot run all protected-resource tests: '+absent.join(', ')+'. Discovery did not identify unique resources.');
  console.error('[qa:ui] See reports/inventory/latest.json and set QA_ROOM_ID, QA_FILE_NAME, QA_FOLDER_NAME in .env.');
  process.exit(2);
}
console.log('[qa:ui] All credentials and room/folder/PDF IDs present; starting browser tests.');
