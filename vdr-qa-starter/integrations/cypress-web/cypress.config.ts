import {defineConfig} from 'cypress';

// Copy to apps/web/cypress.config.ts in the VDR frontend checkout.
// Component tests do NOT require backend, real login or public demo access.
export default defineConfig({
  component: {
    devServer: {framework:'react',bundler:'vite'},
    specPattern: 'cypress/component/**/*.cy.tsx',
    supportFile: 'cypress/support/component.tsx',
    video: false,
    screenshotOnRunFailure: true,
  },
});
