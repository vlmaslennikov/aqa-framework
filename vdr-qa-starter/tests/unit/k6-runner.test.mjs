import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepare } from '../../scripts/k6-run.mjs';
import { extractSummary } from '../../scripts/k6-analyze.mjs';
import { ACK, HEAVY_ACK } from '../../performance/k6/policy.js';
const id = 'aa0c1111-2222-4333-8444-555555555555';
const state = { schemaVersion: 1, runId: 'r', email: 'vdr-perf-hello@example.invalid', password: 'b'.repeat(30), ownerId: id, roomId: id, folderId: id, fileId: id, fileCount: 120, size: 'small' };
const good = {
  DATABASE_URL: 'postgresql://qa:qa_local_only@127.0.0.1:54329/vdr_qa_test',
  DIRECT_URL: 'postgresql://qa:qa_local_only@127.0.0.1:54329/vdr_qa_test',
  QA_INTEGRATION_ACK: 'I_OWN_THIS_LOCAL_DB',
  K6_LOCAL_QA_ACK: ACK,
  K6_BASE_URL: 'http://127.0.0.1:3000',
};
test('runner validates local test DB, local URL, owned fixture before spawning k6', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vdr-qa-perf-'));
  const file = path.join(tmp, 'state.json');
  try {
    fs.writeFileSync(file, JSON.stringify(state));
    assert.equal(prepare('smoke', good, file).fixture.roomId, id);
    assert.throws(() => prepare('smoke', { ...good, K6_BASE_URL: 'https://virtual-data-room-ten.vercel.app' }, file));
    assert.throws(() => prepare('smoke', { ...good, DATABASE_URL: 'postgresql://a:b@prod.net:5432/prod' }, file));
    assert.throws(() => prepare('smoke', { ...good, K6_VUS: '5000' }, file), /must be unset/);
    assert.throws(() => prepare('smoke', { ...good, K6_OUT: 'cloud' }, file), /must be unset/);
    assert.throws(() => prepare('volume', { ...good, K6_HEAVY_ACK: HEAVY_ACK }, file), /Volume needs/);
    assert.throws(() => prepare('scalability', { ...good, K6_HEAVY_ACK: HEAVY_ACK }, file), /K6_SCALE_LABEL/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
test('summary analyzer returns thresholds PASS only for actual threshold evidence', () => {
  const x = { root_group: {}, metrics: {
    http_req_duration: { values: { med: 90, 'p(95)': 245, 'p(99)': 370 }, thresholds: { 'p(95)<1200': { ok: true } } },
    http_reqs: { values: { count: 100, rate: 8.5 } },
    http_req_failed: { values: { rate: 0 } },
    qa_contract_errors: { values: { rate: 0 }, thresholds: { 'rate<0.02': { ok: true } } },
    checks: { values: { rate: 1 } },
  } };
  assert.equal(extractSummary(x).verdict, 'PASS');
  assert.equal(extractSummary({ ...x, metrics: { ...x.metrics, qa_contract_errors: { values: { rate: 0.4 }, thresholds: { 'rate<0.02': { ok: false } } } } }).verdict, 'FAIL');
  assert.equal(extractSummary({ root_group: {}, metrics: {} }).verdict, 'NO_THRESHOLDS');
  assert.throws(() => extractSummary({ metrics: {} }));
});

test('analyzes the actual --summary-export shape: flat metrics and false means threshold not breached', () => {
  const sample = { root_group: {}, metrics: {
    http_reqs: { count: 1582, rate: 26.31 },
    http_req_duration: { med: 8.51, 'p(95)': 17.69, thresholds: { 'p(95)<1200': false } },
    http_req_failed: { value: 0, thresholds: { 'rate<0.02': false } },
    qa_contract_errors: { value: 0, thresholds: { 'rate<0.02': false } },
    checks: { value: 1, passes: 1577, fails: 0, thresholds: { 'rate>0.98': false } },
  } };
  const analyzed = extractSummary(sample);
  assert.equal(analyzed.totalRequests, 1582);
  assert.equal(analyzed.requestsPerSecond, 26.31);
  assert.equal(analyzed.p50Ms, 8.51);
  assert.equal(analyzed.p95Ms, 17.69);
  assert.equal(analyzed.p99Ms, null);
  assert.equal(analyzed.transportErrorRate, 0);
  assert.equal(analyzed.contractErrorRate, 0);
  assert.equal(analyzed.checksRate, 1);
  assert.equal(analyzed.verdict, 'PASS');
  assert.equal(analyzed.thresholds.length, 4);
  assert.equal(extractSummary({ ...sample, metrics: {
    ...sample.metrics,
    http_req_duration: { ...sample.metrics.http_req_duration, thresholds: { 'p(95)<1200': true } },
  } }).verdict, 'FAIL');
  assert.throws(() => extractSummary({ ...sample, metrics: {
    ...sample.metrics, http_req_duration: { thresholds: { 'p(95)<1200': false } },
  } }), /Missing k6 metric/);
});
