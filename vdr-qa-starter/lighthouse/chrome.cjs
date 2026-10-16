/**
 * Chromium launch policy shared by Lighthouse CI and Lighthouse User Flows.
 * Disabling the Chromium sandbox is a security downgrade: opt in explicitly.
 */
const SANDBOX_ENV = 'LHCI_CHROME_NO_SANDBOX';

function chromiumArgs(env = process.env) {
  const value = env[SANDBOX_ENV] ?? '0';
  if (!['0', '1'].includes(value)) {
    throw new Error(`${SANDBOX_ENV} must be 0 or 1`);
  }
  return value === '1' ? ['--no-sandbox', '--disable-setuid-sandbox'] : [];
}

function diagnoseChromeFailure(output = '') {
  if (/No usable sandbox|zygote_host_impl_linux|Failed to move to new namespace/i.test(output)) {
    return 'Chromium sandbox unavailable (Ubuntu AppArmor/user namespaces). ' +
      'Preferred: use a browser with working sandbox. For isolated, trusted QA only: ' +
      'set LHCI_CHROME_NO_SANDBOX=1, which disables the Chromium sandbox.';
  }
  if (/cannot open shared object file|error while loading shared libraries/i.test(output)) {
    return 'Chromium is missing shared libraries. Run ldd on the Chrome executable and install the missing OS libraries.';
  }
  if (/Permission denied/i.test(output)) {
    return 'Chromium executable lacks permission. Check executable path and chmod +x.';
  }
  return 'Chromium could not start. Check CHROME_PATH, dynamic libraries, and stderr above.';
}

module.exports = {chromiumArgs, diagnoseChromeFailure};
