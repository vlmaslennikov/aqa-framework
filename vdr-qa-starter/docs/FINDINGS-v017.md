# Product findings register — VDR Product QA v0.17

**Evidence rule:** `REPRODUCED_HTTP` ≠ `REPRODUCED_MOCK_BOUNDARY` ≠ `SOURCE_RISK` ≠ `NOT_TESTED`. Exact public deployment revision unknown. No code fixes to the VDR business logic have been applied.

**Severity** = potential business impact; **priority** = order of fixing/investigation. Report only confirmed defects as "bugs"; limitations and hypotheses belong in separate groups.

| ID | Group | Impact / Priority | Evidence | Description |
|---|---|---|---|---|
| **QA-FILE-02** | Confirmed backend validation gap | Major / **P1 conditional** | Prior 201 vs 400 with fake Storage; source review | Completion persists Storage-reported size >50 MiB, contradicting application's maximum |
| **QA-AUTH-06** | Confirmed input validation gap | Minor / **P2** | Prior HTTP 201 vs 400; actual DTO review | Blank-trimmed registration display name accepted |
| QA-SEC-01 | Confidentiality / contract decision | Potential major / P1 investigation | SOURCE_RISK; old-URL test not run | Signed URL previously issued before revoke may remain usable |
| QA-OPS-08 | Data lifecycle failure mode | Potential major / P1 investigation | Fake Storage deletion failure; source review | DB row deleted despite failed blob removal; no visible durable retry |
| QA-OPS-04 | MVP product limitation | Minor / P2 | SOURCE_REVIEW | Unfinished upload records do not have scheduled cleanup |
| QA-AUTH-05 | Session policy limitation | P2 policy review | README / SOURCE_REVIEW | 7-day JWT is not individually revocable |
| QA-DATA-03 | Concurrency hypothesis | P2 investigation | NOT_REPRODUCED | Race between case-insensitive duplicate creates unresolved; prior pair gave 201/409 |

## QA-AUTH-06: whitespace-only name

**Precondition:** QA PostgreSQL + locally hosted backend; no public writes.  
**Steps:** POST `/auth/register` with new QA email, valid password, and `name: '   '`. Or inspect the database-free `make test-known-unit` reproduction, which uses the real Nest `ValidationPipe` and `RegisterDto`.  
**Expected:** HTTP `400`, validation error for name; no user created.  
**Actual:** Earlier user integration log: HTTP `201` (unexpected). `RegisterDto` uses `IsNotEmpty()` without trimming, and service trims name after validation.  
**Impact:** empty display name / inconsistent client/server validation, not an auth bypass.  
**Recommended fix:** transform/trim before validation and reject blank value. Add validation tests for `''`, `'   '`, leading/trailing whitespace, max length and Unicode whitespace.

## QA-FILE-02: actual completed file exceeds limit

**Precondition:** disposable QA PostgreSQL, owned pending upload, fake Storage info.  
**Steps:** create upload intent with declared size <50 MiB, then fake `getObjectInfo()` returning `50*1024*1024 + 1` bytes; POST `/files/:id/complete`.  
**Expected:** HTTP `400` and no `uploadedAt` mark for oversized actual content.  
**Actual:** Prior user integration log: HTTP `201` and oversized metadata accepted; `FilesService.completeUpload` uses `info.size` but has no actual-size guard.  
**Impact:** limit/cost/policy gap **if** real Supabase bucket permits oversized object. Real bucket constraint was not probed; do not claim a live exploit.  
**Recommended fix:** check actual object size at completion, keep pending on failure and specify cleanup. Test exactly 50 MiB and +1 using test bucket.

## QA-SEC-01: link revocation contract (NOT a confirmed bug)

Currently `/files/:id/download-url` uses short-lived signed URLs (300 seconds, source inspection). Revoke blocks new permissioned requests, but earlier signed URLs may still work until expiry. **Requirement ambiguity:** is revocation intended to terminate *new* access only or all outstanding URLs?  
**Experiment:** in disposable Supabase only, issue signed URL as Viewer; revoke as Owner; confirm API rejects new URL, probe exact old URL immediately, then after expiration. Do not log URL/signature. Clarify semantics with product owner before marking a defect.

## QA-OPS-08: orphan blob on Storage failure (design risk)

Local PDF integration previously passed a test *observing* deletion of DB metadata despite fake Storage failure. `FilesService.remove()` swallows `removeObject()` rejection, apparently without retry persistence. A green test confirms current behavior, **not** correctness. Investigate cleanup retries, tombstones, retention policies and impact of confidential orphan objects.

## Limitations and non-findings

- QA-OPS-04: abandoned upload cleanup not required explicitly by MVP; request TTL/retention policy.
- QA-AUTH-05: individual JWT revocation not promised; document operational implications before setting production policy.
- QA-DATA-03: no confirmed duplicate race; bounded concurrency experiment on disposable PostgreSQL required.
- Optional search and versioning explicitly out of mandatory scope.
- Lighthouse accessibility scores and ScanRepo heuristics do not constitute security or WCAG conformance tests.
- Failures of our install scripts/Makefiles were QA tooling defects, **not** bugs in the VDR product.

## Submission evidence provenance

- **Prior Ubuntu product execution (user console):** Jest core 7/7, PDF lifecycle 4/4, Cypress 8/8, Playwright API 9/9, Playwright browser earlier 5/5; plus separate expected-red 2/2 known defects. Historical logs aren't attached as raw Playwright/Jest reports in this artifact.
- **Current v0.17:** reproducible source-level boundary assertions in `virtual-data-room-main/apps/api/test/qa-known-boundaries.spec.ts`, plus `make test-known` expected-red full HTTP tests. No current PostgreSQL claim until fresh execution.
- **Future same-run evidence:** `make qa-evidence-local`, `make qa-evidence-browser`; retain hashed source snapshot and sanitized logs. Evidence utility tests do not count as product tests.
