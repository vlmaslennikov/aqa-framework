/** Mutations can create accounts that this product has no API to delete. */
export function requireDisposableTarget(env) {
  if (env.RUN_MUTATION_TESTS !== '1' || env.QA_ENV_DISPOSABLE !== '1') {
    throw new Error('Both RUN_MUTATION_TESTS=1 and QA_ENV_DISPOSABLE=1 are required');
  }
  const value = env.API_BASE_URL;
  if (!value) throw new Error('Set API_BASE_URL explicitly');
  let url;
  try { url = new URL(value); }
  catch { throw new Error('API_BASE_URL must be a valid URL'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http(s) targets are supported');
  const host = url.hostname.toLowerCase();
  if (host === 'virtual-data-room-production.up.railway.app' ||
      host === 'virtual-data-room-ten.vercel.app' ||
      host.endsWith('.vercel.app') || host.endsWith('.railway.app')) {
    throw new Error('Public demo / hosted domain rejected; use disposable local or dedicated staging');
  }
  if (!['localhost','127.0.0.1','::1'].includes(host) && env.QA_ENV_ALLOW_REMOTE !== '1') {
    throw new Error('Remote targets require QA_ENV_ALLOW_REMOTE=1 and explicit authorization');
  }
  return url.toString();
}
