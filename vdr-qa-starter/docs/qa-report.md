# Historical document — not current submission

Current reviewer entry points: [`QA-SUBMISSION-v017.md`](QA-SUBMISSION-v017.md), [`FINDINGS-v017.md`](FINDINGS-v017.md), and [`TRACEABILITY-v017.md`](TRACEABILITY-v017.md). Earlier statements are retained for provenance and may be superseded.

---

> **Updated checkpoint (2026-10-16):** The newer evidence inventory and requirements coverage are in [`qa-checkpoint-v016.md`](qa-checkpoint-v016.md) and [`requirements-traceability-v016.md`](requirements-traceability-v016.md). This historical report preserves earlier dated observations and must not be treated as the latest execution summary.

# Product QA Report — VDR, execution checkpoint

**Date:** 2026-10-15  
**Subject:** https://github.com/evo9/virtual-data-room  
**Goal:** Functional correctness and protection of confidential content in an MVP VDR.  
**Test evidence status:** Mixed. Results below were described in previous session transcript, while current artifact only passed its own safety harness unit tests. The previous live API logs/Playwright product reports and Work branch changes are not available in this runtime. The newly uploaded Chromium tarball is available and was validated separately. See `evidence/verification-manifest.md` for tests actually run here.

## What was tested / inspected

1. Requirements, README architecture and backend DTO/services; risk matrix prioritizes access isolation and revocation.
2. Prior reported execution: backend Jest unit suite 42/42 passed.
3. Prior reported API live flow: email sharing with nested folder access, Viewer denied write, revoke blocked subsequent access. The public-link test was corrected after an initially wrong endpoint choice; a definitive passing public-link runtime result is not available in the transcript.
4. Prior reported auth registration: whitespace-only display name was accepted — reproduced defect.
5. Prior reported backend unit (mock storage): >50 MiB actual storage file metadata accepted at completion — reproduced server gap, live bypass unknown.
6. Prior reported concurrency attempt: requests returned 201/409, so the suspected duplicate-name race was not reproduced.
7. Prior ScanRepo: LOW 24.5/100; six signals triaged as unconfirmed, no malware observed; external scanner findings are not VDR functional results.
8. **New browser validation (uploaded tarball):** Chromium 153.0.8010.12 launched via Python Playwright; data-page DOM/click/screenshot PASS, localhost HTTP navigation PASS (200). The prior socket() launch issue did not reproduce.
9. **New artifact checks:** safety and ScanRepo wrapper harness 7/7 PASS. Node npm installation failed DNS resolution (`EAI_AGAIN`), so the TypeScript `@playwright/test` suite did not run. Remote VDR navigation from this container timed out; no new live product result is claimed.

## Automated coverage

- Jest in product backend: 42 checks reported passed in previous environment. These are the product's preexisting unit tests, **not** newly created coverage.
- Playwright read-only API: health, login, `/auth/me`, rejection of bad password, private room authorization, pagination, invalid public token.
- Playwright browser: positive/negative sign-in (product tests not executed in current environment). Standalone Python Playwright browser/environment smoke PASSED, but it is **not** a product E2E test.
- Playwright opt-in **disposable-only** API: nested scoped email sharing, Viewer read-only, revoke, public room link revoke, negative input validation and whitespace-name regression.
- Local Node harness tests: mutation environment protection (4 passed here).
- ScanRepo: optional manual CI workflow, JSON/stdout/stderr/metadata capture; does **not** scan local uncommitted changes.
- Results/HTML/traces set up for Playwright; no prior product evidence report was recovered. New browser evidence is in `evidence/chromium-diagnostic-2026-10-15.json` and the smoke screenshot.

## Key issues and risks

| Risk | Assessment |
|---|---|
| Incomplete post-upload actual-size enforcement | P1 conditional; demonstrated with mocked storage; verify real Supabase enforcement before declaring live exploit. |
| Blank display name accepted | P2 reproduced in previous API run. |
| Signed URLs after share revoke | P1/P2 pending acceptance policy and runtime verification; new URL requests are revoked correctly in previous test. |
| Abandoned upload records, non-revocable JWTs | MVP limitations needing explicit product acceptance. |
| UI and file-upload happy/negative paths | Missing verified browser/storage evidence in this checkpoint. |

## Release readiness

**Insufficient evidence for production approval / CONDITIONAL NO-GO for a security-sensitive production release.** This is not a claim that the live demo is broken. Do not assert `GO` until critical file lifecycle, anonymous/public-link access, cross-account isolation and browser paths are executed with preserved evidence and the storage-gap risk is adjudicated.

## What to test next

First: browser sign-in, PDF upload/view, public share + revoke and exact signed-URL reuse in a disposable environment. Second: bounded concurrency under repeatable conditions and payload validation. Third: broader accessibility, responsive, pagination/empty states and cleanup lifecycle. Then rerun Jest, Playwright API and UI suites with versioned run manifests and attach sanitized evidence.

## AI usage statement

AI helped analyze code/requirements, derive risk-based test scenarios, create TypeScript Playwright tests, implement test-environment safeguards, and draft findings. Observations from AI are not accepted as confirmed defects without runtime evidence. ScanRepo findings require independent manual review.

## Lighthouse CI implementation checkpoint (v0.4, 2026-10-15)

**Added, not yet executed against deployed VDR:** Lighthouse CI with public/auth configs, Puppeteer login hook, route integrity verifier, navigation audits (performance, accessibility, best practices), optional SPA user flow (timespan + snapshots), private JSON/HTML output, warn-level budgets, safety restrictions and manual CI example. No Lighthouse scores, Web Vitals, or real VDR browser findings are claimed.

**Executed in this artifact:** 14/14 local harness unit tests PASS (7 previously present and 7 new), syntax checks PASS, Lighthouse configuration preflight PASS. See `evidence/lighthouse-validation.log`. `@lhci/cli` and Puppeteer have NOT been installed here because npm registry DNS is unavailable; actual Lighthouse collection must be run locally by the user.

**Release readiness unchanged.** UI audit scores do not replace missing P0 access-control and file lifecycle evidence. VDR's private routes are explicitly tested to prevent false positives caused by redirecting to Login. CI intentionally audits public pages only until local private/staging verification is completed.

## Lighthouse verified product evidence — user local run, 2026-10-16

User supplied six successful LHCI authenticated navigation measurements (3 x Dashboard and 3 x Shared With Me), with correct route checks. Their `qa-summary.json` is preserved as `evidence/lighthouse-auth-user-run-2026-10-16.json` and calculated medians are in `docs/lighthouse-observed-results.md`. Dashboard 97/100 median Performance (LCP 2.007 s); Shared With Me 99/100 (LCP 1.923 s); both 100/100 Accessibility and Best Practices and CLS 0. These measurements show no significant *observed* page-load issues in the audited states; they cannot prove WCAG compliance or release readiness.

## QA overlay v0.5 (tooling verification)

Standalone harness: 23/23 Node unit tests PASS, LHCI config PASS, offline medians reproduced from user-provided summary. Existing working Chromium was provided and previously verified by user; this QA build did not run a new live Lighthouse collection against the deployed site. Optional room/folder/file LHCI audits and a read-only Playwright smoke suite were added but not executed against the product. `integrations/cypress-web` includes four `PdfViewer` component cases targeting the publicly visible component interface; they have not run with the real `apps/web` code because the user Work branch is not present here. Integration tests against real NestJS/Prisma/PostgreSQL remain unimplemented in this standalone overlay.

Release status unchanged: **insufficient end-to-end evidence for production approval**; continue access-control/file lifecycle tests in isolated env before asserting readiness.

## QA overlay v0.6 — inventory-based E2E preparation

Added a fully read-only API inventory client and UUID discovery for an existing `Overview.pdf`, with explicit limits, cursor handling, ambiguity detection and private snapshots. Three read-only API smoke checks cover selected room, folder (including valid empty state) and PDF metadata. Lighthouse and Playwright load discovered UUIDs automatically, unless nonempty values have explicitly been supplied. Local unit tests passed (see evidence/v060-local-validation.txt). Live VDR API calls, new authenticated Lighthouse runs and new Playwright E2E runs have NOT been executed from this environment; they require user local execution. These results do not establish a historical file baseline or identify any deleted files. Release conclusion unchanged.

### v0.9 performance-testing implementation (not yet executed against VDR)

A guarded Grafana k6 API performance suite has been prepared. It exercises localhost NestJS + Prisma + `vdr_qa_test` PostgreSQL only, with smoke/load/stress/spike/soak/volume/scalability presets. Sampled endpoint contracts include `GET /health`, `/data-rooms`, `/data-rooms/:id/contents`, `/folders/:id/contents`, `/folders/:id/breadcrumbs`, and `/files/:id` (metadata only). JSON summaries and an offline analyzer are provided.

**Result: NOT RUN** (no local k6 binary or backend PostgreSQL available in this execution environment). Record actual p50/p95/p99/RPS/error rate, fixture size, host configuration, timestamps, and setup for each run before claiming performance results. These runs do NOT cover Supabase PDF byte-transfer, actual user browser latencies, or scalable replica topology; scalability requires changing backend resources and repeating an identical k6 workload. See `docs/performance-v0.9.md`.
