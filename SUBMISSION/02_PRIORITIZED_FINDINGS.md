# Prioritized bug / findings report

**Evidence rule.** Findings were re-assessed against original `task.md`, unmodified application source and actual test results. Earlier AI-authored summaries were not treated as independent proof. Severity and priority are QA assessments, not employer-provided categories. **Reproduced with mocked dependencies does not mean confirmed on the deployed build.**

## A. Reproduced product behaviors / bug candidates

| ID | Priority | Type / status | Finding and impact | Evidence |
|---|---|---|---|---|
| **QA-FILE-02** | **P1 conditional** | Validation defect; **reproduced at service boundary and earlier local HTTP test with mocked Storage** | `/files/:id/complete` accepts returned object size **50 MiB + 1 byte**; can mark oversized metadata uploaded. Real Supabase bucket bypass **NOT tested**. | Source `apps/api/src/files/files.service.ts`, `test/qa-known-defects.int-spec.ts`, `test/qa-known-boundaries.spec.ts`; user log: HTTP 201 vs 400. |
| **QA-AUTH-06** | **P2** | Validation defect; **earlier HTTP reproduced** | Registration accepts `name: "   "` (HTTP **201**, expected **400**), then trims it, allowing blank display name. Not an auth bypass. | Real validation DTO + user-provided local HTTP log; `test/qa-known-boundaries.spec.ts`. |
| **QA-NEW-01** | **P1 investigation** | Reliability issue candidate; **reproduced with isolated dependency stubs** | If signing an upload URL fails after the pending file DB row was created, no compensation is performed; stale pending records may reserve names. **PostgreSQL persistence scenario not yet run for this new finding.** | Source `FilesService.createUploadIntent`; `make qa-investigate`, `make qa-investigate-api`. |
| **QA-NEW-02** | **P1 investigation** | Destructive UX candidate; **reproduced at React component logic boundary** | When folder delete-preview fails, the dialog shows an error but still enables Delete. User cannot inspect what will be removed. **Full Cypress/browser repro not yet supplied.** | `apps/web/src/features/data-room/components/delete-folder-dialog.tsx`; `make qa-investigate-ui`. |

### Reproduction detail — two earlier HTTP findings

**QA-AUTH-06.** Send `POST /auth/register` with a new valid test email, valid password and `name:"   "` on **isolated local VDR**. Expected: validation status 400. Observed in user's prior Jest integration output: 201. Fix recommendation: trim input before nonblank validation; include normalized-name tests. Avoid creating accounts on shared demo.

**QA-FILE-02.** In **isolated integration harness** create a pending file with a declared acceptable size; return object metadata for `50*1024*1024+1` bytes from fake Storage; call completion. Expected: 400 and `uploadedAt=null`. Observed: 201; record completed. Fix recommendation: check actual size at completion, with an explicit response and cleanup behavior. Validate effective enforcement separately on dedicated Supabase bucket.

### Reproduction detail — new conditional findings

**QA-NEW-01.** Force fake `createUploadUrl()` to throw after metadata `create()`. Expected: rollback, cleanup or documented eventual recovery. Observed with dependency stubs: pending record persists. Real DB and UX consequences need follow-up. Suggested product action: explicit PENDING/FAILED state, expiry or compensation with durable retry.

**QA-NEW-02.** Open DeleteFolderDialog; intercept delete-preview with HTTP 503. Expected: disallow destructive confirmation unless valid preview or explicit alternative warning. Observed in isolated component execution: `disabled=false` while error shown. Suggested UX: disable Delete until preview succeeds and offer retry. Confirm in real browser before declaring deployed defect.

## B. Risks, policy questions — **NOT confirmed bugs**

| Priority | Risk / product limitation | Decision/test needed |
|---|---|---|
| **P0 investigation** | Already-issued 300-second signed download URL may remain usable after share revoke | Define revoke semantics; obtain URL, revoke share, retry **same URL**, then after TTL, in disposable Storage. Never publish signed URLs. |
| **P1 investigation** | DB deletion before failed Storage cleanup may leave orphaned object | Fake Storage integration observed row removed despite failed blob deletion; determine durable retry/retention policy. |
| **P2** | Abandoned pending uploads may not expire/clean automatically | Confirm required retention/cleanup SLA; monitor metadata buildup. |
| **P2 policy** | Individually revoking seven-day JWT sessions not supported | Confirm MVP session policy before raising a defect. |
| **P2 hypothesis** | Concurrent duplicate-name race | Not reproduced; one earlier 201/409 outcome does **not** prove a race. |

## C. Missing *test coverage*, not necessarily missing product features

**High value:** real Supabase PDF upload/download SHA-256; mixed multi-file drag-and-drop with progress and retry; delete shared folder while Viewer is browsing; preissued signed URL behavior after revoke; exact size boundary in actual bucket; error/empty-state/mobile/keyboard exploratory evidence; reproducible 100k-row pagination/load baseline. Search/versioning are optional original requirements and **not** logged as bugs.

**Triage decision.** No unconditional confidential-production approval on current evidence. For a take-home exercise, explicitly documenting these distinctions is preferable to claiming an invented bug count.
