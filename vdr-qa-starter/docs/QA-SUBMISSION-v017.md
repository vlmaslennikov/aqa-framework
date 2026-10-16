# Virtual Data Room — Product QA practical assignment

**Assessment date:** 2026-10-16  
**System under test (SUT):** archived [`virtual-data-room-main`](../../virtual-data-room-main); publicly deployed VDR referenced in its README. Archived source version and deployed source equivalence **not confirmed**.  
**Work type:** manual/exploratory review, targeted automation using the testing pyramid, prioritized product findings. No product business logic fixes were applied.

## Executive summary

**Two product validation gaps have been reproduced**, although their impacts differ:

- **QA-AUTH-06 — P2 / minor:** whitespace-only account name passes validation; prior local HTTP run returned `201`, expected `400`.
- **QA-FILE-02 — conditional P1 / major:** a completed file's actual Storage metadata can exceed the application limit of 50 MiB. Prior local HTTP integration reported `201`, expected `400`, with **mocked Storage**. Real Supabase exploitation was **not** tested.

Other important concerns are **risk investigations**, not confirmed failures: pre-issued signed URL behavior after share revoke, orphan objects when Storage deletion fails, cleanup for abandoned uploads, individual JWT revocation and a potential concurrency naming race. See [`FINDINGS-v017.md`](FINDINGS-v017.md).

**Recommendation:** no unconditional production GO for confidential due-diligence materials from this evidence alone. The take-home submission is viable as a documented *partial* assessment; the remaining P0/P1 tests and risk decisions are explicit.

## How the product was tested

The original [`task.md`](../../virtual-data-room-main/task.md) prioritizes (1) UX and functionality including edge/error states, (2) design/polish, (3) code quality. For a VDR, we apply additional risk weight to unauthorized disclosure and destructive file actions.

- **Black-box read-only Playwright API and browser** against existing test accounts/resources on a deployed demo. Never mutate the shared Vercel/Railway deployment.
- **NestJS + Prisma + dedicated PostgreSQL** with fake external Storage: transactions, permissions, sharing, upload, file integrity, naming and deletion. This tests HTTP/DB contracts, but not actual Supabase CORS/signed PUTs.
- **Cypress React component** tests for `PdfViewer` and `UploadPanel`: loading, retry, download, progress and dismissal behavior.
- **Original product unit tests** (`make test-product-unit`): fast regression signal written by the app author, not counted as newly authored QA coverage.
- **Node QA framework unit/guard tests:** configuration, fixture discovery, safe-target protections, reports. These are *tool reliability checks*, not tests of product behavior.
- **Lighthouse CI:** six earlier successful authenticated navigation audits (selected screens only), no blanket WCAG/security conclusion.
- **k6 Docker:** prepared local API workload; do not include absent raw k6 metrics as current product performance evidence.

The **reusable framework** is a practical foundation, not a completed universal QA product. Auth API helpers, owned test data, cleanup, environment guards, common commands, CI, reporters and run manifests are reused across scenarios. Add most new business behavior tests at integration/component level; keep the browser suite small.

### Testing pyramid — verified versus merely authored

| Layer | Authorship | Prior execution observed in user logs | Newly authored in v0.16–v0.17 |
|---|---|---|---|
| Product unit | Upstream developer | 42 tests reportedly passed in previous session, not a raw report in current run | v0.17 adds `make test-product-unit` to full run |
| Component (Cypress) | QA | 8/8 PASS on Ubuntu Chrome 146 | No additional cases this update |
| Nest HTTP + PostgreSQL | QA | Core 7/7 PASS, PDF Lifecycle 4/4 PASS | 10 naming/pagination/delete/sharing cases from v0.16 **UNRUN** |
| API (Playwright read-only) | QA | 9/9 PASS | No additional cases this update |
| Browser (Playwright) | QA | Earlier 5/5 PASS | Stronger 401/error assertions, empty form and actual existing-PDF-byte assertion **UNRUN** |
| Tooling safety/unit | QA | 66/66 in v0.16 archive | New evidence-runner unit checks in v0.17 (separate verification log) |

Prior counts cannot be combined into a *new execution pass percentage*. Their timestamps/configuration/environment differ; no linked raw reports are bundled for all prior Ubuntu runs. The v0.17 evidence runner produces fresh same-run data instead.

### Requirement coverage overview

| Area / original requirement | State | Main evidence / outstanding case |
|---|---|---|
| Authentication and owner isolation | **PARTIAL PASS** | Login/401 + IDOR API and integration; empty/whitespace names still problematic |
| Nested folders and breadcrumbs | **PARTIAL PASS** | Content and folder smoke; naming/pagination and subtree preview newly authored, UNRUN |
| Multi-file upload / drag-drop / progress | **PARTIAL** | Cypress component states PASS; actual simultaneous browser-to-Storage upload UNRUN |
| PDF view, rename, move and delete | **PARTIAL PASS** | Local HTTP byte-store 4/4 PASS, SHA-256, owner permissions; live Supabase E2E UNRUN |
| Room/folder/file sharing in two modes | **PARTIAL PASS** | Narrower earlier share tests PASS; complete six-combination matrix newly authored, UNRUN |
| Revoke access | **PARTIAL PASS** | New API URLs denied after revoke; pre-issued signed URL reuse UNRUN and policy undecided |
| UX/design on errors and deletion | **LIMITED EXPLORATORY** | Earlier public empty form/field errors and protected-route redirect observed; deletion during active viewing and responsive/accessibility states UNRUN |
| 100k files / scaling | **NOT VERIFIED** | k6 and metadata seeding prepared; no current reproducible measurements for this submission |

Details, IDs and acceptance oracles: [`TRACEABILITY-v017.md`](TRACEABILITY-v017.md).

## Prioritized findings

| Severity / Priority | Finding | Status |
|---|---|---|
| S2 / P1 conditional | Actual completed file size is not validated again against 50 MiB | **Reproduced at mocked-Storage boundary**; Supabase path unverified |
| S3 / P2 | Whitespace-only display name accepted | **Reproduced** (earlier local HTTP 201) |
| S2 / P1 investigation | Previously issued 5-minute signed URL after share revoke | **Design risk**, no actual URL replay |
| S2 / P1 investigation | Delete DB row then swallow Storage error: orphan blob | **Observed local fake Storage behavior**; recovery policy absent in source review |
| S3 / P2 | Pending uploads do not expire/clean up automatically | **Source-review limitation**, not stipulated MVP bug |
| S2 / P2 policy | No individual JWT session revocation | **Documented limitation**, not automatic MVP violation |

Source-reviewed concurrency concerns have not been reproduced and are *not* counted as confirmed defects. Search and versioning are optional in upstream task and excluded as mandatory acceptance failures.

## Missing test cases / product questions

1. **P0:** Verify signed URL obtained before share revoke immediately after and after the 300-second TTL on a disposable Supabase bucket. Decide the required semantics and document acceptance explicitly.
2. **P0:** Execute full `DATAROOM/FOLDER/FILE × USER/PUBLIC_LINK` matrix against local PostgreSQL with sanitized Jest reports; nested and sibling isolation must hold.
3. **P1:** Real browser multi-file upload, drag/drop, individual progress, network failure, cancellation/retry, CORS errors; verify PDF download bytes with SHA-256 against the original file.
4. **P1:** Delete folder while a Viewer is browsing it; verify warning, in-flight UI behavior, next navigation and storage error recovery.
5. **P1:** 50 MiB exactly / 50 MiB +1 end-to-end Storage enforcement, MIME/type contract and unfinished-upload cleanup.
6. **P2:** Keyboard navigation, focus and screen-reader labels, narrow/mobile viewport, empty states, duplicate collision under bounded concurrency, expired public links and stale sessions.

An absent test is not proof the feature is missing. Exploratory charters and provenance: [`EXPLORATORY-v017.md`](EXPLORATORY-v017.md).

## Environment and evidence integrity

All mutating integration tests are guarded to run only against `vdr_qa_test` on localhost. Storage E2E additionally requires a local VDR and explicitly acknowledged disposable bucket; it is **off by default**. Source-archive hash is recorded by the run tool, but a deployed build SHA is unknown. Browser/login credentials and Storage signed URLs must never be printed in public reports.

Use [`EVIDENCE-RUNBOOK-v017.md`](EVIDENCE-RUNBOOK-v017.md) to create new timestamped `summary.json`/`summary.md`. `BLOCKED`, `SKIPPED` and `PARTIAL` are not PASS; green *guard* tests do not imply product quality. Disclose if CI/build/environment is unavailable.

## AI usage disclosure

AI assisted with requirements decomposition, test-case ideation, code/test scaffolding, safe execution guards, debugging environment/tooling, script analysis, risk classification and documentation. Human operator executed key Ubuntu product tests and supplied console outputs; conclusions explicitly distinguish observed results from AI-generated hypotheses and mocked-boundary reproductions. All AI-generated tests and recommendations should be peer-reviewed; AI is not treated as a source of runtime proof.

## Deliverables

Test plan; risk prioritization; detailed findings; manual exploratory charters/observations; Playwright API/UI, Cypress CT and Nest integration test suites; reusable fixtures and environment isolation; Make/CI; execution evidence runner and current state / known gaps. We intentionally do not claim completed real Supabase E2E, full load results, or production release approval.
