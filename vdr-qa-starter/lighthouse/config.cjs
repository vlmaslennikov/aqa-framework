// VDR standalone QA overlay. Run from the QA package root.
// Defaults to LOCAL targets; never publishes reports to temporary-public-storage.
try {
  const dotenv = require('dotenv');
  dotenv.config();
  require('../scripts/qa-resource-env.cjs').loadQaResourceIds(process.env, require('node:path').resolve(__dirname, '..'));
} catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
const path = require('node:path');
const {assertSafeTarget, getTarget} = require('./target.cjs');
const {chromiumArgs} = require('./chrome.cjs');
const {getAuditRoutes} = require('./routes.cjs');

const mode = process.env.LHCI_MODE || 'public';
if (!['public', 'auth'].includes(mode)) {
  throw new Error(`Unsupported LHCI_MODE: ${mode}`);
}
const base = getTarget();
assertSafeTarget(base, process.env);
const urls = getAuditRoutes(mode, process.env);

// VDR is authenticated and non-indexed. SEO is intentionally out of scope.
const chromeArgs = chromiumArgs(process.env);
const settings = {
  onlyCategories: ['performance', 'accessibility', 'best-practices'],
  maxWaitForLoad: 60000,
  // Lighthouse needs to use the JWT placed in localStorage by the login hook.
  ...(mode === 'auth' ? {disableStorageReset: true} : {}),
  ...(mode === 'public' && chromeArgs.length ? {chromeFlags: chromeArgs.join(' ')} : {}),
};
module.exports = {
  ci: {
    collect: {
      url: urls.map((route) => new URL(route, base).toString()),
      numberOfRuns: Number(process.env.LHCI_RUNS || 3),
      ...(process.env.CHROME_PATH || process.env.CHROMIUM_EXECUTABLE_PATH
        ? {chromePath: process.env.CHROME_PATH || process.env.CHROMIUM_EXECUTABLE_PATH}
        : {}),
      ...(mode === 'auth' ? {
        // LHCI resolves this path relative to the working directory, NOT absolute.
        puppeteerScript: 'lighthouse/login.cjs',
        // Puppeteer launches Chrome *separately* from Lighthouse's collector.
        // The same flags must be forwarded to both launchers.
        puppeteerLaunchOptions: {args: ['--disable-dev-shm-usage', ...chromeArgs]},
      } : {}),
      settings,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', {minScore: 0.80}],
        'categories:accessibility': ['warn', {minScore: 0.90}],
        'categories:best-practices': ['warn', {minScore: 0.85}],
        'largest-contentful-paint': ['warn', {maxNumericValue: 2500}],
        'cumulative-layout-shift': ['warn', {maxNumericValue: 0.10}],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: path.resolve(__dirname, '..', 'reports', 'lighthouse', mode),
    },
  },
};
