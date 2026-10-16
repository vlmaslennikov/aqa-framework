const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertQaDatabase } = require('./qa-db-guard.cjs');
const good = {
  DATABASE_URL: 'postgresql://qa:qa_local_only@127.0.0.1:54329/vdr_qa_test',
  DIRECT_URL: 'postgresql://qa:qa_local_only@127.0.0.1:54329/vdr_qa_test',
  QA_INTEGRATION_ACK: 'I_OWN_THIS_LOCAL_DB',
};
test('accepts exactly named isolated local QA database', () => {
  assert.equal(assertQaDatabase(good), true);
});
test('rejects missing explicit consent', () => {
  assert.throws(() => assertQaDatabase({...good, QA_INTEGRATION_ACK: ''}), /QA DB guard/);
});
test('rejects external PostgreSQL service', () => {
  assert.throws(() => assertQaDatabase({...good, DIRECT_URL: 'postgresql://qa:password@prod.example.com:5432/vdr_qa_test'}), /local/);
});
test('rejects a production database name', () => {
  assert.throws(() => assertQaDatabase({...good, DATABASE_URL: 'postgresql://qa:qa@127.0.0.1:54329/prod'}), /local/);
});
test('rejects differing direct and pooled DB URLs', () => {
  assert.throws(() => assertQaDatabase({...good, DIRECT_URL: 'postgresql://qa:qa@127.0.0.1:54320/vdr_qa_test'}), /same/);
});
