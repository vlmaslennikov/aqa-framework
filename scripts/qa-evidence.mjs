#!/usr/bin/env node
/** Captures *actual* execution evidence. It never substitutes earlier reported results.
 * Local suites use a guarded, disposable PostgreSQL. Browser suites are read-only.
 * No direct external mutation tests or load tests are run here.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fsSync from 'node:fs';
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UTC = () => new Date().toISOString();
const scopes = {
  local: [
    ['product-unit', 'test-product-unit', 'PRODUCT'],
    ['qa-framework', 'test-framework', 'TOOLING'],
    ['qa-guards', 'test-guards', 'TOOLING'],
    ['known-boundaries', 'test-known-unit', 'KNOWN_FINDINGS'],
    ['api-integration', 'test-integration', 'PRODUCT'],
    ['pdf-lifecycle', 'test-pdf', 'PRODUCT'],
    ['requirements', 'test-requirements', 'PRODUCT'],
    ['sharing-matrix', 'test-sharing', 'PRODUCT'],
    ['cypress-components', 'test-cypress', 'PRODUCT'],
  ],
  browser: [
    ['playwright-api', 'test-api', 'PRODUCT'],
    ['playwright-ui', 'test-ui', 'PRODUCT'],
  ],
};

/** Remove likely secrets from captured console output; never publish logs without human review. */
export function redact(input) {
  return String(input)
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+/gi, '$1[REDACTED]')
    .replace(/(accessToken|password|service_role_key|api_key)\s*[=:]\s*['"]?[^\s,'"}]+/gi, '$1=[REDACTED]')
    .replace(/https?:\/\/[^\s<>'"]+\?[^\s<>'"]+/gi, '[SIGNED_OR_QUERY_URL_REDACTED]')
    .replace(/(postgres(?:ql)?:\/\/)[^\s]+/gi, '$1[REDACTED]');
}

/** Parsers cover known Jest/Node test runner, Playwright and Cypress summary formats. */
/** Parse Node.js test-runner summaries in both interactive (ℹ) and piped TAP (#)
 * output. `test-guards` starts two separate node --test processes, so sum completed
 * test-runner blocks instead of accidentally reporting only the first one.
 */
function parseNodeTestCounts(output) {
  const blocks = [];
  let current = null;
  for (const line of output.split('\n')) {
    const m = line.match(/^\s*(?:#|ℹ)\s+(tests|pass|fail|skipped|cancelled)\s+(\d+)\s*$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    if (key === 'tests') {
      current = { total: Number(rawValue), passed: null, failed: null, skipped: 0, cancelled: 0 };
      blocks.push(current);
    } else if (current) {
      const field = {pass:'passed', fail:'failed', skipped:'skipped', cancelled:'cancelled'}[key];
      current[field] = Number(rawValue);
    }
  }
  if (!blocks.length || blocks.some(b => b.total === 0 || b.passed === null || b.failed === null ||
    b.passed + b.failed + b.skipped + b.cancelled > b.total)) return null;
  return blocks.reduce((sum, b) => ({
    total: sum.total + b.total,
    passed: sum.passed + b.passed,
    failed: sum.failed + b.failed + b.cancelled,
    skipped: sum.skipped + b.skipped,
  }), { total: 0, passed: 0, failed: 0, skipped: 0 });
}

export function parseCounts(output) {
  const out = String(output).replace(/\u001b\[[0-9;]*m/g, '');
  // Jest summary format (one Jest invocation per evidence target).
  let m = out.match(/Tests:\s*(\d+)\s+passed(?:,\s*(\d+)\s+failed)?(?:,\s*(\d+)\s+skipped)?(?:,\s*(\d+)\s+total)?/i);
  if (m) return { passed: +m[1], failed: +(m[2] ?? 0), skipped: +(m[3] ?? 0), total: +(m[4] ?? (+m[1] + +(m[2] ?? 0) + +(m[3] ?? 0))) };
  m = out.match(/Tests:\s*(\d+)\s+failed(?:,\s*(\d+)\s+passed)?(?:,\s*(\d+)\s+skipped)?(?:,\s*(\d+)\s+total)?/i);
  if (m) return { passed: +(m[2] ?? 0), failed: +m[1], skipped: +(m[3] ?? 0), total: +(m[4] ?? (+m[1] + +(m[2] ?? 0) + +(m[3] ?? 0))) };
  const nodeTestCounts = parseNodeTestCounts(out);
  if (nodeTestCounts) return nodeTestCounts;
  const cypress = out.match(/(?:✔|✓)\s+All specs passed!\s+[^\n]*?\s+(\d+)\s+\1\s+-\s+-\s+-/);
  if (cypress) return { passed: +cypress[1], failed: 0, skipped: 0, total: +cypress[1] };
  const cypressFallback = out.match(/(?:^|\n)\s*(\d+)\s+passing\b/);
  if (cypressFallback) return { passed: +cypressFallback[1], failed: 0, skipped: 0, total: +cypressFallback[1] };
  const playwright = out.match(/(?:^|\n)\s*(\d+)\s+passed\s*\(/);
  const pwSkipped = out.match(/(?:^|\n)\s*(\d+)\s+skipped\b/);
  const pwFailed = out.match(/(?:^|\n)\s*(\d+)\s+failed\b/);
  if (playwright || pwSkipped || pwFailed) {
    const passed = +(playwright?.[1] ?? 0), skipped = +(pwSkipped?.[1] ?? 0), failed = +(pwFailed?.[1] ?? 0);
    return { passed, failed, skipped, total: passed + failed + skipped };
  }
  return null;
}

export function classify(exitCode, output, lane, counts = parseCounts(output)) {
  if (lane === 'KNOWN_FINDINGS') {
    return exitCode === 0 && counts?.total === 2 && counts?.passed === 2
      ? 'FINDINGS_REPRODUCED' : exitCode !== 0 ? 'FAIL' : 'INCONCLUSIVE';
  }
  if (exitCode === 0 && counts?.total > 0 && counts.failed === 0) {
    return counts.skipped === counts.total ? 'SKIPPED'
      : counts.skipped ? 'PARTIAL' : 'PASS';
  }
  const blocker = /(?:Node\s+[\d.]+\s+not installed|nvm missing|Missing .*\.env(?:\.test)?|OWNER_EMAIL|OWNER_PASSWORD|Set OWNER|Missing required|Executable doesn't exist|Cannot find module|Cannot find package|npm ERR!|ECONNREFUSED|P1001:|Can't reach database server|Error: spawn docker|command not found|discovery.*failed|not found.*chromium|Chromium not found)/i;
  return exitCode !== 0 && blocker.test(output) ? 'BLOCKED' : 'FAIL';
}

function sutSourceFingerprint() {
  const paths = ['virtual-data-room-main/task.md',
    'virtual-data-room-main/apps/api/prisma/schema.prisma'];
  const source = join(ROOT, 'virtual-data-room-main/apps/api/src');
  function walk(dir) {
    const { readdirSync, statSync } = fsSync;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, ent.name);
      if (ent.isDirectory()) walk(file);
      else if (ent.isFile() && file.endsWith('.ts')) paths.push(relative(ROOT, file));
    }
  }
  try { walk(source); } catch { return null; }
  const hash = createHash('sha256');
  for (const name of paths.sort()) {
    try { hash.update(name + '\0'); hash.update(readFileSync(join(ROOT, name))); }
    catch { return null; }
  }
  return hash.digest('hex');
}
function fingerprint(path) {
  try { return createHash('sha256').update(readFileSync(join(ROOT, path))).digest('hex'); }
  catch { return null; }
}
function gitRevision() {
  const r = spawnSync('git', ['-C', join(ROOT, 'virtual-data-room-main'), 'rev-parse', 'HEAD'], { encoding: 'utf8', timeout: 4000 });
  return r.status === 0 ? r.stdout.trim() : null;
}

export function formatMarkdown(summary) {
  const header = [
    '# VDR QA run evidence', '',
    `- Run ID: \`${summary.runId}\``,
    `- Started (UTC): ${summary.startedAt}`,
    `- Target: ${summary.scope}; mutation tests on public deployment **excluded**`,
    `- Node (runner): ${summary.nodeVersion}`,
    `- SUT source Git SHA: ${summary.sutGitSha ?? 'unknown (source archive only)'}`,
    `- SUT task.md SHA-256: \`${summary.taskSha256 ?? 'unavailable'}\``,
    `- SUT source snapshot SHA-256: \`${summary.sutSourceSha256 ?? 'unavailable'}\``,
    `- Overall: **${summary.overall}**`, '',
    '| Layer / suite | Status | Tests passed | Failed | Skipped | Evidence log |',
    '|---|---|---:|---:|---:|---|',
  ];
  for (const r of summary.results) {
    const c = r.counts;
    header.push(`| ${r.name} (${r.lane}) | ${r.status} | ${c?.passed ?? '—'} | ${c?.failed ?? '—'} | ${c?.skipped ?? '—'} | \`${r.logFile}\` |`);
  }
  header.push('', 'A green tooling/guard suite is **not** proof that VDR works correctly.',
    'FINDINGS_REPRODUCED denotes demonstrated **defects**, not passing product requirements.',
    'BLOCKED/SKIPPED/PARTIAL do not count as complete product verification.',
    'Previously reported Ubuntu results are maintained separately; not counted here.',
    'Raw local logs may contain sensitive test information; review/redact before sharing.', '');
  return header.join('\n');
}

async function main() {
  const scopeIndex = process.argv.indexOf('--scope');
  const scope = scopeIndex >= 0 ? process.argv[scopeIndex + 1] : 'local';
  if (!['local', 'browser', 'all'].includes(scope)) {
    throw new Error('Usage: node scripts/qa-evidence.mjs --scope local|browser|all');
  }
  const selected = scope === 'all' ? [...scopes.local, ...scopes.browser] : scopes[scope];
  const runId = UTC().replace(/[:.]/g, '-');
  const runDir = join(ROOT, 'reports', 'qa-runs', runId);
  mkdirSync(runDir, { recursive: true, mode: 0o700 });
  chmodSync(runDir, 0o700);
  const summary = {
    schemaVersion: 1,
    runId, startedAt: UTC(), scope, nodeVersion: process.version,
    sutGitSha: gitRevision(), taskSha256: fingerprint('virtual-data-room-main/task.md'),
    sutSourceSha256: sutSourceFingerprint(),
    overall: 'IN_PROGRESS', results: [],
    source: 'LOCAL_EXECUTION_ONLY',
  };
  for (const [name, target, lane] of selected) {
    process.stdout.write(`[qa evidence] Running ${name} (${target})...\n`);
    const startedAt = UTC();
    const executed = spawnSync('make', ['--no-print-directory', target], {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 180_000,
      env: { ...process.env, FORCE_COLOR: undefined, NO_COLOR: '1' },
    });
    const rawOutput = [executed.stdout ?? '', executed.stderr ?? '', executed.error?.message ?? ''].join('\n');
    const output = redact(rawOutput);
    const logFile = `${name}.log`;
    writeFileSync(join(runDir, logFile), output, { mode: 0o600 });
    chmodSync(join(runDir, logFile), 0o600);
    const exitCode = typeof executed.status === 'number' ? executed.status : 124;
    const counts = parseCounts(rawOutput);
    const status = classify(exitCode, rawOutput, lane, counts);
    summary.results.push({ name, lane, target, startedAt, finishedAt: UTC(), exitCode,
      status, counts, logFile, timeout: executed.signal === 'SIGTERM' });
    process.stdout.write(`[qa evidence] ${name}: ${status}${counts ? ` (${counts.passed}/${counts.total})` : ''}\n`);
  }
  const statuses = summary.results.map(r => r.status);
  summary.overall = statuses.includes('FAIL') || statuses.includes('INCONCLUSIVE') ? 'FAIL'
    : statuses.some(s => ['BLOCKED', 'PARTIAL', 'SKIPPED'].includes(s)) ? 'INCOMPLETE' : 'COMPLETE';
  summary.finishedAt = UTC();
  writeFileSync(join(runDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', { mode: 0o600 });
  writeFileSync(join(runDir, 'summary.md'), formatMarkdown(summary), { mode: 0o600 });
  process.stdout.write(`[qa evidence] Report: ${relative(ROOT, join(runDir, 'summary.md'))} (${summary.overall})\n`);
  process.exitCode = summary.overall === 'COMPLETE' ? 0 : summary.overall === 'INCOMPLETE' ? 2 : 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { process.stderr.write(`[qa evidence] ${e.message}\n`); process.exitCode = 1; });
}
