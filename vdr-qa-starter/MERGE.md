# Integration into the existing Work branch

The Work branch files were not transferred to the current runtime, therefore these files are a **standalone v0.2 continuation**, not proof of an in-place update. It would be unsafe to overwrite your more recent source/test work.

Recommended merge sequence:

1. Put the archive in a separate directory and compare `docs/qa-report.md`, `docs/findings.md` and your actual previous report. Preserve your earlier verified screenshots and raw ScanRepo JSON.
2. Cherry-pick non-overlapping files: `scripts/target-safety.mjs`, `scripts/scanrepo.mjs`, `scripts/guard-mutation.mjs`, `tests/unit/target-safety.test.mjs`, `tests/api/public-share.mutation.spec.ts`, `tests/api/registration.mutation.spec.ts`, and the new documents.
3. Reconcile existing `package.json`, `.github/workflows/*.yml`, `playwright.config.ts` and `src/support/api.ts` manually rather than overwriting.
4. Ensure all negative POST/PATCH/DELETE flows are `@mutation`. Run harness safety tests, TypeScript checks, then only read-only API/UI checks. Mutation tests require disposable staging and a reset plan.
5. Preserve the **real previous ScanRepo JSON and original SUT commit hash** in your Work branch. Do not use the prior `LOW 24.5/100` as a fresh result for a modified branch.

Nothing in this archive modifies the original virtual-data-room backend or deploys changes.

## Lighthouse CI v0.4 additions (merge manually)

This archive is **a separate QA overlay**, not the latest Work branch. To integrate:

1. Diff your Work branch's `qa/` against this extracted folder; do not replace more recent tests or reports.
2. Copy `lighthouse/`, `scripts/lighthouse-*.mjs`, `.github/workflows/lighthouse.yml` (to monorepo root's `.github/workflows/`), `tests/unit/lighthouse.test.mjs`, and `docs/lighthouse*.md`.
3. Merge the Lighthouse npm scripts and devDependencies in the QA package; avoid duplicates and preserve your lockfile. Regenerate lockfile with `PUPPETEER_SKIP_DOWNLOAD=1 npm install` and commit it after successful testing.
4. Add `.lighthouseci/` and `reports/lighthouse/` to `.gitignore` and the Lighthouse env variables from `.env.example`.
5. Build the Vite frontend with correct `VITE_API_URL`, and run `npm run lighthouse:public` before `auth`.

Do not copy the archived `.github` folder under `qa/.github` and expect GitHub to discover it: GitHub Actions workflows must live at the **monorepo root** `.github/workflows/`.
