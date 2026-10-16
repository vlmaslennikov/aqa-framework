# Final Product QA Report — Virtual Data Room

**Date:** 16 October 2026  
**System:** `evo9/virtual-data-room` source archive included in package; deployed frontend/backend URLs in upstream README. The deployed commit was **not matched to a source SHA**.  
**Assessment:** **PARTIAL — CONDITIONAL NO-GO for unrestricted confidential production.** This is a risk-based recommendation, not a claim that the public demo fails its basic flows.

## What was tested

- Reviewed original requirements, code paths for authorization/sharing, folder operations, upload/complete/storage integration and delete preview.
- **Previously user-executed Ubuntu checks:** upstream NestJS unit **42/42 PASS**; QA NestJS/PostgreSQL core integration **7/7 PASS**; PDF lifecycle **4/4 PASS** (byte-preserving fake Storage + SHA-256); naming/pagination/deletion requirements **4/4 PASS**; sharing matrix **6/6 PASS**; Cypress React components **8/8 PASS**; Playwright UI **7/7 PASS**. These were **separate documented runs**, primarily v0.18, not a single freshly verified v0.21 run.
- Last provided Playwright API evidence: **6 passed / 3 skipped (PARTIAL)** due to missing test-resource IDs; an automatic-discovery fix was authored later, but its live rerun was not provided.
- Known-defect HTTP regression previously produced **201 instead of 400** for both blank name and oversized metadata; corresponding boundary repros and source analysis exist. A source-level investigation additionally reproduced the pending-upload and delete-preview behavior with isolated dependency stubs.
- Lighthouse authenticated audits were previously executed (6 audits) on selected routes; they provide limited performance/accessibility indicators only.

## Priority findings and business impact

| Priority | Item | Impact / evidence qualifier |
|---|---|---|
| Conditional **P1** | Actual Storage size not revalidated on upload completion | Server metadata accepts >50 MiB in mocked-Storage tests; real bucket acceptance unknown. |
| **P1 investigation** | Failed signed-upload URL leaves pending metadata | Potential stale file/name reservation; source-boundary reproduction, DB integration still needed. |
| **P1 investigation** | Delete allowed when subtree preview fails | Destructive action despite missing warning information; component-logic reproduction, real-browser validation pending. |
| **P2** | Whitespace-only display name accepted | Inconsistent validation and blank display names; local HTTP 201. |
| **P0 investigation** | Reuse of preissued signed URL after share revoke | Confidentiality semantics undefined; not yet a confirmed violation. |
| **P1 investigation** | Orphan blob after Storage deletion failure | Fake Storage integration observed metadata already removed; define retry/tombstone policy. |

Detailed evidence, repro steps and status distinctions: [02_PRIORITIZED_FINDINGS.md](02_PRIORITIZED_FINDINGS.md).

## Automated coverage and testing pyramid

QA-authored **Cypress component, Jest/Nest+Postgres integration, Playwright API and Playwright UI** are organized around shared fixtures, auth helpers, environment guards and repeatable `make` commands. Original product Jest unit suite is included as upstream baseline, not newly authored QA work. Framework safety/unit checks are tracked independently and do **not** count as product tests. See [03_TESTING_APPROACH.md](03_TESTING_APPROACH.md).

## Missing or incomplete verification

1. P0: Replay identical previously issued signed URL immediately after revoke and after expiry on *disposable* Supabase; confirm product policy.
2. P1: Browser multi-file drag-and-drop including duplicate/failed uploads, retry and per-file progress; real Storage download hash.
3. P1: Owner deletes shared folder while Viewer has it open, including failed preview and recovery.
4. P1: Abort PUT/complete, orphan cleanup/recovery and actual size/type enforcement at 50 MiB boundary.
5. P2: Mobile/keyboard UX exploratory screenshots, expired public link, large dataset performance/pagination under controlled local load.

These items are **not automatically product defects**. No blanket accessibility/security claim is made based on basic tests, Lighthouse or static analysis.

## Release readiness and recommendation

**No unconditional GO for live confidential M&A documents** based on this assignment evidence alone: key storage/security end-to-end cases are unverified, and server-side size validation warrants remediation or compensating enforcement. For MVP/demo purposes, the tested core authentication, permissions, folder/file metadata and basic UI flows show positive results on the specified test boundaries; this is not full production certification.

**Next:** (1) validate and triage 2 new P1 investigation candidates in isolated integration/Chrome; (2) run disposable Supabase signed-URL revoke + file hash E2E; (3) capture explicit exploratory evidence for mixed upload and delete UX; (4) re-run all suites under one known app commit and attach `summary.json`, screenshots/traces and reproducible notes; (5) decide remediation and re-test.

## AI use

AI supported requirement decomposition, risk ranking, test generation/refactoring, framework scripts, investigation design and reporting. Local product test results were supplied by the human operator; hypotheses are explicitly distinguished from executed evidence. AI-generated conclusions were rechecked against source code and are not counted as independent test results. See [05_AI_DISCLOSURE.md](05_AI_DISCLOSURE.md).


## Verification completion addendum (NOT RUN)

A follow-up package adds four read-only Playwright exploratory charters and a guarded disposable-Supabase signed-URL revocation observation. These are **pending runtime execution**. Their existence is not a new finding or an increase in verified product coverage. The baseline status and release recommendation above remain unchanged pending first-hand evidence.
