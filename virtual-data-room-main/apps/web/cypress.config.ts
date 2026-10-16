import { defineConfig } from 'cypress';

/** Real React 19 components; Vite resolves @ aliases from apps/web/vite.config.ts. */
export default defineConfig({
  video: false,
  screenshotOnRunFailure: true,
  component: {
    devServer: { framework: 'react', bundler: 'vite' },
    specPattern: 'cypress/component/**/*.cy.tsx',
    supportFile: 'cypress/support/component.ts',
    indexHtmlFile: 'cypress/support/component-index.html',
  },
});
