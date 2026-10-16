import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// CLI scans a REMOTE public repository snapshot, not the local working tree.
// Repository value is constrained to a public host/path; spawnSync never uses a shell.
const repo = process.env.SCANREPO_REPOSITORY ?? 'github.com/evo9/virtual-data-room';
if (!/^(github\.com|bitbucket\.org)\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(repo)) {
  console.error('SCANREPO_REPOSITORY must be github.com/owner/repo or bitbucket.org/workspace/repo');
  process.exit(2);
}
const outputDir = resolve('reports/scanrepo');
mkdirSync(outputDir, { recursive: true });
const startedAt = new Date().toISOString();
const params = ['--yes', 'scanrepo', repo, '--json', '--no-publish'];
const res = spawnSync('npx', params, { encoding: 'utf8', timeout: 180_000, maxBuffer: 20 * 1024 * 1024 });
let report = null;
try { report = JSON.parse(res.stdout ?? ''); } catch { /* preserve raw for triage */ }
const exitCode = res.status ?? 1;
const summary = {
  source: 'scanrepo-cli',
  target: repo,
  requestedAt: startedAt,
  completedAt: new Date().toISOString(),
  // A default-branch scan must not be associated with a local uncommitted HEAD.
  localGitCommit: process.env.GITHUB_SHA ?? null,
  note: 'External public snapshot. The scanned commit is NOT verified to match local changes.',
  exitCode,
  meaning: exitCode === 0 ? 'LOW / PASS (heuristic)' : exitCode === 2 ? 'DANGEROUS / BLOCK' : 'SUSPICIOUS, INCONCLUSIVE OR ERROR',
  parsedJson: report !== null,
  runtimeError: res.error ? res.error.message : null,
};
writeFileSync(resolve(outputDir, 'metadata.json'), JSON.stringify(summary, null, 2) + '\n');
writeFileSync(resolve(outputDir, 'scan.json'), report === null ? '{}' : JSON.stringify(report, null, 2) + '\n');
writeFileSync(resolve(outputDir, 'scan.stdout.txt'), res.stdout ?? '');
writeFileSync(resolve(outputDir, 'scan.stderr.txt'), res.stderr ?? '');
console.log(JSON.stringify(summary, null, 2));
process.exitCode = [0,1,2].includes(exitCode) ? exitCode : 1;
