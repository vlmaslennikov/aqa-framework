/** Explicit allowlist of actual authenticated VDR routes. Never audit bearer tokens in URLs. */
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const targets = [
  ['LHCI_ROOM_ID', '/room/'],
  ['LHCI_FOLDER_ID', '/folder/'],
  ['LHCI_FILE_ID', '/file/'],
];
function getAuditRoutes(mode, env = process.env) {
  if (!['public','auth'].includes(mode)) throw new Error(`Unsupported LHCI_MODE: ${mode}`);
  if (mode === 'public') return ['/login', '/register'];
  const routes = ['/', '/shared-with-me'];
  for (const [variable, prefix] of targets) {
    const value = env[variable];
    if (!value) continue;
    if (!UUID.test(value)) throw new Error(`${variable} must be a UUID (8-4-4-4-12 format)`);
    routes.push(prefix + value.toLowerCase());
  }
  return routes;
}
module.exports = {getAuditRoutes};
