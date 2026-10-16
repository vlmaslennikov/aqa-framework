/** Parse a local k6 --summary-export JSON and provide evidence for a QA report. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function extractSummary(summary) {
  if (!summary || typeof summary !== 'object' || !summary.metrics || !summary.root_group) throw new Error('Invalid or incomplete k6 summary');
  const metrics = summary.metrics;
  // k6 --summary-export writes flat metrics; handleSummary() writes nested values.
  const pick = (key, field) => {
    const info = metrics[key];
    const values = info?.values ?? info;
    const result = field === 'rate' ? (values?.rate ?? values?.value) : values?.[field];
    return typeof result === 'number' && Number.isFinite(result) ? result : null;
  };
  const thresholds = Object.entries(metrics).flatMap(([name, info]) =>
    Object.entries(info.thresholds || {}).map(([threshold, value]) => ({
      name, threshold,
      // In --summary-export a boolean answers "was the threshold breached?".
      // In handleSummary() the object answers "was the threshold OK?".
      passed: typeof value === 'boolean' ? value === false : value?.ok === true,
    })));
  const stats = {
    totalRequests: pick('http_reqs', 'count'),
    requestsPerSecond: pick('http_reqs', 'rate'),
    p50Ms: pick('http_req_duration', 'med'),
    p95Ms: pick('http_req_duration', 'p(95)'),
    p99Ms: pick('http_req_duration', 'p(99)'),
    transportErrorRate: pick('http_req_failed', 'rate'),
    contractErrorRate: pick('qa_contract_errors', 'rate'),
    checksRate: pick('checks', 'rate'),
    thresholds,
    verdict: thresholds.length ? (thresholds.every(t => t.passed) ? 'PASS' : 'FAIL') : 'NO_THRESHOLDS',
    caveat: 'HTTP GET metadata benchmark; not real PDF file transfer, not browser UX, not a capacity guarantee.',
  };
  if (thresholds.length) {
    for (const [name, value] of Object.entries({
      http_reqs: stats.totalRequests,
      http_req_duration: stats.p95Ms,
      http_req_failed: stats.transportErrorRate,
      qa_contract_errors: stats.contractErrorRate,
      checks: stats.checksRate,
    })) {
      if (value === null) throw new Error(`Missing k6 metric: ${name}; cannot verify thresholds`);
    }
  }
  return stats;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/k6-analyze.mjs reports/performance/<summary>.json');
    const report = extractSummary(JSON.parse(readFileSync(process.argv[2], 'utf8')));
    console.log(JSON.stringify(report, null, 2));
    if (report.verdict !== 'PASS') process.exitCode = 1;
  } catch (e) { console.error('[k6 analyze] ' + e.message); process.exitCode = 1; }
}
