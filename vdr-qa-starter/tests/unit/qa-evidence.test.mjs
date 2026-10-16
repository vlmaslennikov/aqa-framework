import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { classify, parseCounts, redact, formatMarkdown } from '../../../scripts/qa-evidence.mjs';

test('evidence: Jest tests parsed as product checks, not raw infrastructure count', () => {
  assert.deepEqual(parseCounts('Test Suites: 1 passed, 1 total\nTests:       7 passed, 7 total'),
    { passed: 7, failed: 0, skipped: 0, total: 7 });
  assert.equal(classify(0, 'Tests:       7 passed, 7 total', 'PRODUCT'), 'PASS');
});
test('evidence: Playwright all skipped is SKIPPED, never PASS', () => {
  const text = 'Running 5 tests using 2 workers\n\n  5 skipped';
  assert.deepEqual(parseCounts(text), { passed: 0, failed: 0, skipped: 5, total: 5 });
  assert.equal(classify(0, text, 'PRODUCT'), 'SKIPPED');
});
test('evidence: Playwright partial is PARTIAL', () => {
  assert.equal(classify(0, '3 skipped\n  2 passed (3.2s)', 'PRODUCT'), 'PARTIAL');
});
test('evidence: tool success without any test evidence is not PASS', () => {
  assert.equal(classify(0, 'All good', 'PRODUCT'), 'FAIL');
});
test('evidence: failing known findings are not silently passed as green', () => {
  assert.equal(classify(0, 'Tests: 2 passed, 2 total', 'KNOWN_FINDINGS'), 'FINDINGS_REPRODUCED');
  assert.equal(classify(0, 'Tests: 1 passed, 1 total', 'KNOWN_FINDINGS'), 'INCONCLUSIVE');
});
test('evidence: explicit missing fixture yields BLOCKED not product FAIL', () => {
  assert.equal(classify(2, 'Missing .env.test. Run make env-qa.', 'PRODUCT'), 'BLOCKED');
});
test('evidence: redacts Bearer token and signed URL query', () => {
  const sanitized = redact('Bearer abc.def.ghi\nhttps://example.test/storage/foo?token=secret123');
  assert.ok(!sanitized.includes('abc.def.ghi'));
  assert.ok(!sanitized.includes('secret123'));
});
test('evidence: manifest explicitly distinguishes historical and current results', () => {
  const report = formatMarkdown({ runId:'test', startedAt:'now',scope:'local',nodeVersion:'v22',
    sutGitSha:null,taskSha256:null,overall:'INCOMPLETE', results:[] });
  assert.match(report, /Previously reported Ubuntu results.*not counted here/);
  assert.match(report, /INCOMPLETE/);
});


test('evidence: piped Node.js TAP is recognized as 79/79 instead of tooling FAIL', () => {
  const tap = '# Subtest: example\nok 1 - example\n  ---\n  duration_ms: 1\n  ...\n1..79\n# tests 79\n# suites 0\n# pass 79\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 100\n';
  assert.deepEqual(parseCounts(tap), { total: 79, passed: 79, failed: 0, skipped: 0 });
  assert.equal(classify(0, tap, 'TOOLING'), 'PASS');
});
test('evidence: Node.js spec reporter ℹ summary is recognized', () => {
  const spec = '✔ test one (2ms)\nℹ tests 74\nℹ suites 0\nℹ pass 74\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\n';
  assert.deepEqual(parseCounts(spec), { total: 74, passed: 74, failed: 0, skipped: 0 });
  assert.equal(classify(0, spec, 'TOOLING'), 'PASS');
});
test('evidence: two sequential guard TAP runs are aggregated (5+3)', () => {
  const tap1 = '# tests 5\n# suites 0\n# pass 5\n# fail 0\n# cancelled 0\n# skipped 0';
  const tap2 = '# tests 3\n# suites 0\n# pass 3\n# fail 0\n# cancelled 0\n# skipped 0';
  const output = `> api@0.0.1 test:qa:guard\n${tap1}\n> api@0.0.1 test:qa:perf:guard\n${tap2}`;
  assert.deepEqual(parseCounts(output), { total: 8, passed: 8, failed: 0, skipped: 0 });
  assert.equal(classify(0, output, 'TOOLING'), 'PASS');
});
test('evidence: a failing or incomplete TAP block cannot be green', () => {
  const failed = '# tests 5\n# pass 4\n# fail 1\n# skipped 0';
  assert.equal(classify(1, failed, 'TOOLING'), 'FAIL');
  const incomplete = '# tests 5\n# pass 5';
  assert.equal(parseCounts(incomplete), null);
  assert.equal(classify(0, incomplete, 'TOOLING'), 'FAIL');
});
test('evidence: script has API resource preflight before read-only API suite', () => {
  const make = readFileSync(new URL('../../../Makefile', import.meta.url), 'utf8');
  assert.match(make, /test-api: env-sync\n\t@cd "\$\(QA\)" && RUN_MUTATION_TESTS=0 bash "\$\(NODE\)" node scripts\/ui-preflight\.mjs/);
});
