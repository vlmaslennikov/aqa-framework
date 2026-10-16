/** QA integration suite is destructive ONLY inside an isolated, explicitly named LOCAL database. */
function assertQaDatabase(env = process.env) {
  const raw = env.DATABASE_URL;
  const direct = env.DIRECT_URL;
  if (!raw || !direct || env.QA_INTEGRATION_ACK !== 'I_OWN_THIS_LOCAL_DB') {
    throw new Error('QA DB guard: supply DATABASE_URL, DIRECT_URL and QA_INTEGRATION_ACK=I_OWN_THIS_LOCAL_DB.');
  }
  for (const candidate of [raw, direct]) {
    let u;
    try { u = new URL(candidate); } catch { throw new Error('QA DB guard: malformed PostgreSQL URL.'); }
    const db = decodeURIComponent(u.pathname.slice(1));
    if (!['postgresql:', 'postgres:'].includes(u.protocol) ||
        !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
        db !== 'vdr_qa_test' || !u.port && u.hostname !== 'localhost') {
      throw new Error('QA DB guard: only local PostgreSQL database vdr_qa_test is permitted.');
    }
  }
  const a = new URL(raw), b = new URL(direct);
  if (a.hostname !== b.hostname || a.port !== b.port || a.pathname !== b.pathname) {
    throw new Error('QA DB guard: DATABASE_URL and DIRECT_URL must refer to the same local QA database.');
  }
  return true;
}
if (require.main === module) {
  try { assertQaDatabase(); console.log('QA DB guard PASS (local vdr_qa_test only).'); }
  catch (err) { console.error(err.message); process.exitCode = 1; }
}
module.exports = { assertQaDatabase };
