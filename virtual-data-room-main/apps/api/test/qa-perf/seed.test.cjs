const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertSeedArgs, SIZES } = require('./seed.cjs');
const good = {
  DATABASE_URL: 'postgresql://qa:qa_local_only@127.0.0.1:54329/vdr_qa_test',
  DIRECT_URL: 'postgresql://qa:qa_local_only@127.0.0.1:54329/vdr_qa_test',
  QA_INTEGRATION_ACK: 'I_OWN_THIS_LOCAL_DB',
};
test('perf seed only allows isolated QA database', () => {
  assert.throws(() => assertSeedArgs(['seed', 'small'], { ...good, DATABASE_URL: 'postgresql://a:b@prod.test:5432/prod' }));
  assert.equal(assertSeedArgs(['seed', 'small'], good).files, 120);
});
test('large 100k fixture requires separate acknowledgement', () => {
  assert.equal(SIZES.xlarge[1], 100000);
  assert.throws(() => assertSeedArgs(['seed', 'xlarge'], good));
  assert.equal(assertSeedArgs(['seed', 'xlarge'], { ...good, QA_PERF_LARGE_ACK: 'I_ACCEPT_100K_METADATA_ROWS' }).files, 100000);
});
test('rejects invalid CLI args', () => {
  assert.throws(() => assertSeedArgs(['seed', 'unknown'], good));
  assert.deepEqual(assertSeedArgs(['cleanup'], good), { cleanup: true });
});
