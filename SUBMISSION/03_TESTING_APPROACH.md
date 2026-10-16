# Testing approach & reusable automation framework

We prioritized meaningful business invariants over test count. For a data room, the most expensive failures are confidential-data disclosure, irreversible deletion and file corruption. The original requirements also place high emphasis on intuitive UX and edge/error handling.

## Testing pyramid (implemented foundation)

| Level | Code / tools | Reused infrastructure | Purpose |
|---|---|---|---|
| **Unit (existing SUT)** | Jest in `apps/api` | Upstream original tests (42 reported PASS) | Fast business-module regressions. **Not QA-authored**. |
| **Component (QA-authored)** | Cypress + React/Vite (`apps/web/cypress/component`) | Common mount, fake hooks/requests | PdfViewer and UploadPanel error/progress/preview states (8/8 historically PASS). |
| **HTTP/DB integration (QA-authored)** | Jest + Supertest + NestJS + Prisma + local PostgreSQL | Reusable `qa-support/harness.ts`, owned test users, DB guard, fake byte Storage | Authentication, scope of sharing, revocation, PDF lifecycle, hashes, collisions, deletion, pagination (21/21 last reported PASS). |
| **API (QA-authored)** | Playwright request (`vdr-qa-starter/tests/api`) | Shared auth/credentials, read-only fixture discovery | Public health, wrong credentials, private resource isolation, list contracts (last evidence 6 passed / 3 skipped). |
| **Browser E2E (QA-authored)** | Playwright Chromium (`vdr-qa-starter/tests/ui`) | Common login/fixtures, traces, screenshots | Basic sign-in and resource routes, negative auth, PDF response checks (last evidence 7/7 PASS). |
| **Optional nonfunctional** | Lighthouse CI, Docker k6 | Read-only local targets, bounded load, evidence analyzer | Performance/accessibility indicators; not a substitute for functional acceptance. |

**Reusable properties:** environment sync from root `.env`, one `Makefile` entry point, Node 22.16 via nvm, browser bootstrap, fixture discovery without mutation, repeatable isolated Postgres, guards preventing dangerous writes/load on demo, and structured `summary.json`/Markdown evidence. The framework is the **beginning of reusable VDR QA automation**, not a universal testing platform.

**What a passing suite does *not* prove:** Cypress's fake API does not prove Supabase CORS or file integrity; local SHA-256 with fake byte store does not prove live object storage behavior; Playwright login smoke does not prove global accessibility/security; Lighthouse scores do not certify WCAG; framework guard tests assess tooling, not product quality. A passing known-defect reproducer means the bug exists.

**Evidence discipline:** each bug receives a source requirement, precondition, repro steps, expected/actual behavior, priority, environment and artifact. Keep `CONFIRMED_LOCAL`, `BOUNDARY_REPRODUCED`, `HYPOTHESIS`, `NOT_RUN`, `BLOCKED`, `PASS` distinct. Never merge counts from unrelated runs/versions into a fictitious all-green total.

**CI and next automation investment:** prioritize the 3-scope × 2-share-mode access matrix and negative permission cases at integration level; keep small critical E2E suite; add genuine Storage contract test once disposable bucket is approved. Pin dependencies/browser versions for CI after local validation. Disable destructive and high-load scenarios by default.
