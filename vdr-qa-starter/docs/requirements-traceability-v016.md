# VDR Product QA — requirement-to-test traceability (v0.16)

Source of application functional requirements: `virtual-data-room-main/task.md`. Source of QA take-home deliverables: user-provided Product QA Practical Assignment in the conversation (test plan, real testing, prioritized findings, valuable automation, reusable testing pyramid, final report and AI assistance disclosure).

This matrix records **intended automated or exploratory coverage**, not proof of execution. The statuses distinguish tests previously executed by the user from newly written scenarios.

| ID | Requirement / product risk | Priority | Oracle | Test level and location | Status |
|---|---|---|---|---|---|
| AUTH-01 | Correct sign-in, wrong password | P0 | HTTP 200/401, visible error, no session | Playwright `tests/ui/login.spec.ts`, `tests/api/auth.readonly.spec.ts` | Previous API/E2E PASS; stronger visible-error assertion NEW/UNRUN |
| AUTH-02 | Empty login form | P1 | Required field errors, zero login requests | Playwright `tests/ui/login.spec.ts` | NEW/UNRUN |
| AUTH-03 | Blank registration name | P2 | HTTP 400, no account created | Jest `test/qa-known-defects.int-spec.ts` | REPRODUCED: 201 instead of 400 |
| AUTH-04 | Private items cannot be enumerated by stranger | P0 | HTTP 401/404, no leaked metadata | Jest `test/qa-core.int-spec.ts`, Playwright API | Previous PASS |
| FOLDER-01 | Create/nest/rename, conflict policy | P1 | trim; case-insensitive name collision -> 409 | Jest `test/qa-requirements.int-spec.ts` | NEW/UNRUN |
| FOLDER-02 | Folder listing, breadcrumbs, keyset pagination | P1 | No duplicates/omissions, pending hidden, cursor validation | Jest `test/qa-requirements.int-spec.ts` | NEW/UNRUN |
| FOLDER-03 | Preview nested delete with accurate count/size and delete subtree | P1 | Exact preview, 204 delete, foreign access 404 | Jest `test/qa-requirements.int-spec.ts`; existing `qa-core` | NEW/UNRUN plus previous subtree PASS |
| FILE-01 | Upload intent, complete, PDF view/download and bytes integrity | P1 | SHA-256 byte-for-byte round trip | Jest `test/qa-pdf-lifecycle.int-spec.ts` | Previous 4/4 PDF suite PASS; real Supabase UNRUN |
| FILE-02 | File name collision, rename/move without overwrite | P1 | Deterministic suffix and original preserved | Jest `test/qa-requirements.int-spec.ts` | NEW/UNRUN |
| FILE-03 | Actual storage size >50 MiB | P1 (conditional) | Completion rejects oversized actual object | Jest `test/qa-known-defects.int-spec.ts` | REPRODUCED with mocked Storage; live bypass NOT proven |
| FILE-04 | Multi-file upload / drag-drop / progress and errors | P1 | Individual progress/error recovery | Cypress `cypress/component/upload-panel.cy.tsx` | Previous 4/4 component PASS; real multi-file UI flow UNRUN |
| SHARE-01 | USER and PUBLIC_LINK for room/folder/file | P0 | 6 scopes/modes, least privilege, 404 on ID substitution, revoked denied | Jest `test/qa-sharing-matrix.int-spec.ts` | NEW/UNRUN; narrower earlier sharing tests PASS |
| SHARE-02 | Signed URL reuse after revoke | P0 decision pending | Compare exact pre-revoke URL after revoke/TTL | Real isolated Supabase exploratory/E2E | UNRUN; must decide desired semantics |
| PERF-01 | Large room lists (100k metadata), latency/errors | P2 | p95/error/thresholds with versioned evidence | Docker k6 local QA only | Other-chat baseline reported; raw user JSON not in this archive |
| UX-01 | Routes, PDF preview, authenticated LHCI | P2 | Protected route isn't redirect-to-login; user-visible PDF | Playwright/LHCI/Cypress | Prior PASS on selected screens; no WCAG compliance inference |
| OPS-01 | ScanRepo security signal triage | P2 | Record SHA/tool version/findings and manual classification | ScanRepo CLI | Previous report; evidence needs fresh scan |

## Evidence rules

- `NEW/UNRUN` never contributes to passed-case counts.
- Product tests require actual NestJS/Prisma/React execution; successful QA unit tests do not prove product correctness.
- The test artifact has no source Git SHA from the deployed application; record SHA and environment URL before final submission.
- Product defects, code-review hypotheses, accepted limitations and test-infrastructure failures are reported separately.
- Never mutate the shared Vercel/Railway demo; test changes on disposable local PostgreSQL and a separate private Supabase bucket only.
