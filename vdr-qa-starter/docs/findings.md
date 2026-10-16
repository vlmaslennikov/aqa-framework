# Historical document — not current submission

Current reviewer entry points: [`QA-SUBMISSION-v017.md`](QA-SUBMISSION-v017.md), [`FINDINGS-v017.md`](FINDINGS-v017.md), and [`TRACEABILITY-v017.md`](TRACEABILITY-v017.md). Earlier statements are retained for provenance and may be superseded.

---

# Prioritized Findings — VDR Product QA

Date: 2026-10-15. **Evidence provenance matters.** Runtime results below are carried over from the previous QA session transcript supplied by the user; the previous full Playwright/Jest reports and source SHA have **not** been transferred into this artifact. Status `MOCK_REPRODUCED` does not mean an exploit was reproduced in deployed Supabase. Do not inflate bug counts with code-review hypotheses.

| ID | Priority | Classification | Status | Finding | Next action |
|---|---|---|---|---|---|
| QA-AUTH-06 | P2 | Validation defect | REPRODUCED_PREVIOUS_RUN (registration request) | Registration accepts a display name consisting only of whitespace. The DTO's `@IsNotEmpty` treats spaces as nonempty. | Reproduce in authorized disposable env; capture status/payload (redacted), fix trim/nonblank server validation, rerun regression. |
| QA-FILE-02 | P1 (conditional) | Backend validation gap | MOCK_REPRODUCED_PREVIOUS_RUN | `completeUpload` accepted storage metadata reporting >50 MiB; declared size is validated earlier. This is a proven code-level gap, not evidence of a live upload bypass. | Test actual storage enforcement on disposable Supabase bucket; size/MIME checks at completion; negative tests of invalid storage state. |
| QA-SEC-01 | P1/P2 (security policy dependent) | Residual access risk | SOURCE-REVIEW / UNTESTED | Existing 5-minute signed URLs may remain usable after sharing revocation, even while newly requested URLs are blocked. | Use controlled PDF and exact pre-revocation signed URL on approved test storage; classify after requirements review. |
| QA-DATA-03 | P2 | Concurrency risk | NOT REPRODUCED (one previous attempt) | A bounded simultaneous folder-creation attempt returned 201 / 409; read-before-write path lacks demonstrated DB uniqueness invariant. | Stress concurrency in disposable environment with stable N and cleanup; unique DB constraint or advisory lock if contract demands uniqueness. |
| QA-OPS-04 | P2 | Known MVP limitation | DOCUMENTED | Abandoned upload intents have no cleanup lifecycle; metadata/storage may accumulate. | Decide TTL policy, cleanup scheduler, observability. |
| QA-AUTH-05 | P1/P2 | Known MVP security limitation | DOCUMENTED | A single 7-day JWT has no individual session revocation. | Define production auth/session policy. |
| QA-SCAN-07 | Informational | Supply-chain signal review | PREVIOUS_RUN_REPORTED | ScanRepo LOW 24.5/100 with 6 heuristic signals; previous inspection found no confirmed malicious behavior. No raw JSON or scan commit carried into current artifact. | Re-run CLI against intended public SHA; preserve metadata; manually triage 6 signals; never treat LOW as secure product. |

## Passed checks / no defect

- Previous run: 42 existing backend unit tests reported PASS (runner log not attached here).
- Previous API scenario: scoped `USER` share allowed Viewer to open nested contents without exposing closed ancestors; denied rename; denied access after share deletion.
- One concurrent folder creation trial: statuses `201, 409`. It does **not** prove all races are prevented.
- Cloud browser showed login page; it was **not** a Playwright execution artifact.

## Confirmed versus conditional

Only QA-AUTH-06 (prior deployed registration API run, per transcript) and QA-FILE-02 (mocked backend unit run, per transcript) were reported reproduced. The latter must explicitly retain the qualifier **mocked storage**. The signed-URL risk and folder race must not be described as confirmed bugs.

## Required defect evidence before external submission

- Git commit/SUT build and API environment, timestamp, browser/version if UI.
- Repeatable preconditions, sequence, exact actual and expected; sample response status/body with secrets removed.
- Run ID, screenshot/trace/log path, reproducibility (N/M).
- Business impact, severity (impact) and priority (fix ordering); mitigation/known limits.
- Do not attach JWTs, signed URLs, passwords, storage keys, or account-specific private data in a public issue.

References: [task.md](https://github.com/evo9/virtual-data-room/blob/main/task.md), [register.dto.ts](https://github.com/evo9/virtual-data-room/blob/main/apps/api/src/auth/dto/register.dto.ts), [files.service.ts](https://github.com/evo9/virtual-data-room/blob/main/apps/api/src/files/files.service.ts), [README](https://github.com/evo9/virtual-data-room), [ScanRepo CLI](https://www.scanrepo.dev/cli).
