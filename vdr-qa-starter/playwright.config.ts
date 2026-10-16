import 'dotenv/config';
const { loadQaResourceIds } = require('./scripts/qa-resource-env.cjs');
loadQaResourceIds(process.env, process.cwd());
import { defineConfig, devices } from '@playwright/test';

// Mutation scenarios can create persistent accounts and data. Never run against the shared demo.
const mutationsEnabled = process.env.RUN_MUTATION_TESTS === '1';
export default defineConfig({
  testDir: './tests',
  testIgnore: mutationsEnabled ? [] : ['**/*.mutation.spec.ts'],
  timeout: 35_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 1 : 0,
  grepInvert: mutationsEnabled ? undefined : /@mutation/,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'reports/playwright/results.json' }]],
  use: {
    baseURL: process.env.WEB_BASE_URL ?? 'https://virtual-data-room-ten.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'api', testDir: './tests/api', use: {} },
    { name: 'chromium', testDir: './tests/ui', use: {
      ...devices['Desktop Chrome'],
      ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { launchOptions: {
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
      }} : {}),
    } },
  ],
});
