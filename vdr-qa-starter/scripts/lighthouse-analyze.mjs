#!/usr/bin/env node
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
const input = resolve(process.argv[2] || 'reports/lighthouse/auth/qa-summary.json');
if (!existsSync(input)) { console.error(`No summary: ${input}`); process.exit(2); }
let data;
try { data = JSON.parse(readFileSync(input,'utf8')); }
catch(e) { console.error(`Invalid JSON: ${e.message}`); process.exit(2); }
if (!Array.isArray(data.rows) || !data.rows.length || !data.verified) {
 console.error('Cannot evaluate a missing or unverified Lighthouse run'); process.exit(2);
}
const clean = n => typeof n === 'number' && Number.isFinite(n) ? n : null;
function median(a) {
 const nums = a.map(clean).filter(n=>n!==null).sort((a,b)=>a-b);
 if (!nums.length) return null;
 const mid = Math.floor(nums.length/2);
 return nums.length % 2 ? nums[mid] : (nums[mid-1] + nums[mid])/2;
}
const groups = new Map();
for(const r of data.rows){
 if (!r.correctRoute || r.runtimeError) { console.error('Invalid route or runtime error in summary'); process.exit(2); }
 const url = new URL(r.expected); // do not output query strings or credentials
 const key = url.pathname;
 if (!groups.has(key)) groups.set(key,[]);
 groups.get(key).push(r);
}
console.log('| Route | Runs | Performance | Accessibility | Best Practices | Median LCP | Median CLS |');
console.log('|---|---:|---:|---:|---:|---:|---:|');
for(const [route, rows] of groups){
 const score = k => {const m=median(rows.map(r=>r.scores?.[k])); return m===null ? 'N/A' : `${Math.round(m*100)}/100`;};
 const lcp=median(rows.map(r=>r.lcpMs));
 const cls=median(rows.map(r=>r.cls));
 console.log(`| ${route} | ${rows.length} | ${score('performance')} | ${score('accessibility')} | ${score('best-practices')} | ${lcp===null?'N/A':(lcp/1000).toFixed(3)+' s'} | ${cls===null?'N/A':cls.toFixed(3)} |`);
}
console.log('Note: lab results; do not treat scores as evidence of authorization correctness or all-state accessibility.');
