# VDR QA Automation — implementation guide

This folder is the **cross-system automation layer** of the [VDR Product QA submission](../README.md). Its tests use Playwright for API/browser checks, Node's built-in test runner for framework/tooling guards, Lighthouse CI for bounded route audits, and a Docker k6 runner for local performance measurements. Backend HTTP/DB integration and Cypress component tests live alongside the corresponding original application in `../virtual-data-room-main/apps/`.

**Read first:** [Root README — architecture and rationale](../README.md) · [Assignment deliverables](../SUBMISSION/README.md) · [Final verification runbook](../SUBMISSION/07_FINAL_VERIFICATION_RUNBOOK.md).

## Layers and boundaries

| Test type | Entry point | Target / limitations |
|---|---|---|
| Framework/guard tests | `make test-framework`, `make test-guards` | QA scripts/config; **not** VDR functionality |
| Playwright API | `make test-api` | Read-only public/local API, discovered UUID fixtures |
| Playwright UI/exploratory | `make test-ui` or `make qa-final-readonly` | Read-only browser journeys; screenshots/traces |
| Isolated real-Storage E2E | `make qa-final-storage` | **Local** NestJS/React/PostgreSQL + dedicated Supabase bucket; guarded |
| Jest + PostgreSQL | `make test-integration`, `make test-pdf`, `make test-requirements`, `make test-sharing` | QA-owned local DB + fake Storage |
| Cypress React components | `make test-cypress` | Actual PdfViewer/UploadPanel with mocked network dependencies |
| Non-functional | `make perf-smoke`, `make lighthouse-auth` | Bounded local performance and chosen-route audits |

## Test layout

```text
tests/
├── api/               # auth / resource / public-link read-only contracts; mutation specs gated
├── ui/                # login, PDF routes, exploratory read-only, guarded Storage lifecycle
└── unit/              # safety guards, environment, discovery, evidence parsers, k6/Lighthouse
src/support/           # shared credentials and API utilities
scripts/               # resource discovery, preflight, Storage safety, k6, Lighthouse, reporting
lighthouse/            # authenticated Lighthouse route navigation helpers
performance/k6/        # bounded load profiles
```

### Standard execution

From the **repository root**, use GNU Make instead of calling arbitrary scripts. Make selects Node.js 22.16.0 and Playwright Chromium and regenerates isolated QA env files from root `.env`:

```bash
make setup
make qa-doctor
make qa-evidence-local
make qa-final-readonly
make qa-report
```

Public demo tests must remain read-only. Real Storage E2E requires a disposable QA project/bucket and explicit acknowledgements; see [runbook](../SUBMISSION/07_FINAL_VERIFICATION_RUNBOOK.md). The separate `@mutation` spec files are excluded at Playwright test **collection** time unless mutation mode is explicitly enabled; enabling a mode without passing its guard is not sufficient.

## How to interpret evidence

`PASS` means a suite actually executed without skips. `PARTIAL`, `SKIPPED`, `BLOCKED` and `NOT RUN` must be visible in the evidence report. `FINDINGS_REPRODUCED` means negative behavior was successfully demonstrated, **not** that the requirement passed. Source-boundary probes and mock-Storage results do not independently establish bugs in the deployed Supabase stack.

New tests should reuse `src/support/`, bounded fixtures and resource discovery, and preserve local/remote target isolation. For architecture justification, traceability, confirmed findings, release readiness and AI disclosure, see the [root project README](../README.md) and [`../SUBMISSION/`](../SUBMISSION/).
