import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLocalTarget, validateProfile, validateFixture, chooseEndpoint, profileOptions, ACK, HEAVY_ACK } from '../../performance/k6/policy.js';

test('rejects external, misleading, or redirect-style target origins', () => {
  for (const s of ['https://virtual-data-room-ten.vercel.app', 'http://127.0.0.1.evil:3000', 'http://127.0.0.1:3000@evil.test', 'http://localhost:3000/foo', 'https://localhost:3000', 'http://127.0.0.1', 'http://127.0.0.1:3000?q=a']) {
    assert.throws(() => validateLocalTarget(s));
  }
  assert.equal(validateLocalTarget('http://127.0.0.1:3000'), 'http://127.0.0.1:3000');
});
test('refuses unacknowledged profile; heavy profiles need second acknowledgement', () => {
  assert.throws(() => validateProfile('smoke', {}));
  assert.equal(validateProfile('smoke', { K6_LOCAL_QA_ACK: ACK }), 'smoke');
  assert.throws(() => validateProfile('stress', { K6_LOCAL_QA_ACK: ACK }));
  assert.equal(validateProfile('stress', { K6_LOCAL_QA_ACK: ACK, K6_HEAVY_ACK: HEAVY_ACK }), 'stress');
  assert.throws(() => validateProfile('weird', { K6_LOCAL_QA_ACK: ACK }));
});
test('fixture refuses missing, non-owned and malformed credentials/IDs', () => {
  assert.throws(() => validateFixture({}));
  const id = 'aa0c1111-2222-4333-8444-555555555555';
  const x = { schemaVersion: 1, runId: 'r', email: 'vdr-perf-hello@example.invalid', password: 'a'.repeat(30), ownerId: id, roomId: id, folderId: id, fileId: id };
  assert.deepEqual(validateFixture(x), x);
  assert.throws(() => validateFixture({ ...x, email: 'admin@production.test' }));
});
test('each weighted endpoint is reachable and selection bounds are checked', () => {
  assert.deepEqual(new Set([0, .11, .26, .40, .49, .70, .80, .99].map(chooseEndpoint)).size, 8);
  assert.throws(() => chooseEndpoint(1));
});
test('profile ceilings and baseline thresholds are present', () => {
  for (const p of ['smoke', 'load', 'stress', 'spike', 'soak', 'volume', 'scalability']) {
    const opts = profileOptions(p);
    assert.equal(opts.maxRedirects, 0);
    assert.ok(opts.thresholds.http_req_duration);
    assert.ok(opts.thresholds.qa_contract_errors);
    if (opts.stages) assert.ok(Math.max(...opts.stages.map(s => s.target)) <= 30);
    else assert.ok(opts.vus <= 10);
  }
});
