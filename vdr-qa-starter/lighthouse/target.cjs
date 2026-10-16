const { URL } = require('node:url');
function getTarget(env = process.env) {
  const value = env.LHCI_WEB_BASE_URL || 'http://127.0.0.1:4173';
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('LHCI target must use http(s)');
  if (url.username || url.password || url.search || url.hash) throw new Error('No credentials, query or hash in Lighthouse URL');
  if (url.pathname !== '/') throw new Error('LHCI_WEB_BASE_URL must be an origin, without a route');
  return url.origin + '/';
}
function assertSafeTarget(base, env = process.env) {
  const url = new URL(base);
  const isLoopback = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname);
  if (!isLoopback && env.LHCI_ALLOW_REMOTE !== '1') {
    throw new Error('External Lighthouse target blocked: set LHCI_ALLOW_REMOTE=1 for your own/approved staging');
  }
  if (env.LHCI_MODE === 'auth' && (!env.OWNER_EMAIL || !env.OWNER_PASSWORD)) {
    throw new Error('LHCI authenticated run requires OWNER_EMAIL and OWNER_PASSWORD');
  }
  if (env.LHCI_MODE === 'auth' && !env.API_BASE_URL && isLoopback) {
    // The frontend may embed an API origin via VITE_API_URL; this is only a warning.
    process.stderr.write('[lhci] Ensure the Vite build points to a running backend (VITE_API_URL).\n');
  }
  return true;
}
module.exports = {getTarget, assertSafeTarget};
