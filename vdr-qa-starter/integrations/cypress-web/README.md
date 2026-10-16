# Cypress Component Testing — source-aware starter for VDR React 19

This is a **copy-in overlay**, not installed into the standalone QA package. It targets actual `PdfViewer` in `apps/web/src/components/pdf-viewer.tsx` as observed in the public repository. If your **Work branch** changed the component interface, reconcile its props before running. No CT execution is claimed in this environment.

From the REAL VDR repository root:

```bash
# Copy 3 files from this integration overlay, preserving their relative paths under apps/web:
cp qa/integrations/cypress-web/cypress.config.ts apps/web/cypress.config.ts
mkdir -p apps/web/cypress/{support,component}
cp qa/integrations/cypress-web/cypress/support/component.tsx apps/web/cypress/support/component.tsx
cp qa/integrations/cypress-web/cypress/component/pdf-viewer.cy.tsx apps/web/cypress/component/pdf-viewer.cy.tsx
cd apps/web
npm install --save-dev cypress
npx cypress run --component --browser chrome
# For interactive time-travel debugging:
npx cypress open --component
```

Prerequisites: React + Vite + React Router dependencies are already in VDR `apps/web`. Component tests mount a `MemoryRouter` to satisfy the Close link. `PdfViewer` is passed controlled props and callbacks: it must not call backend or Supabase. Chromium must be locally installed and Cypress must be able to locate a compatible browser. Cypress may use a different browser than Playwright's unpacked build; choose a supported `--browser` explicitly.

Coverage:
- File name and pending preview shell;
- Inline `<object type="application/pdf">` renderer after URL;
- View-URL error → Retry and Download fallback;
- Download pending disabled state.

This does **not** validate real PDF byte rendering, signed URL permissions or file lifecycle (Playwright E2E + backend integration test required). After we obtain the actual current Work branch, we can add Upload Panel and Share Dialog CT using their true props/hooks rather than guessing them.
