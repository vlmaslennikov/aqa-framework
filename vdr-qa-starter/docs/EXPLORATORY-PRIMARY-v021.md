# Exploratory testing: planned primary observations (v0.21)

**No browser-exploratory session was executed in this workspace.** The earlier AI-written session notes are NOT treated as first-hand findings. This file contains charters and blank evidence slots, not invented observations.

Use an approved *disposable* environment for all modifying actions. Record base URL, build/commit SHA, browser version, tester, clock (UTC), role, fixture IDs (do not publish tokens), screenshots/traces, cleanup. Never use public sample documents for deletion/upload tests.

| Charter | Risk / required behavior | Setup / stimuli | Oracle / record |
|---|---|---|---|
| EXP-01 | Preview failure + destructive operation | Owner opens Delete folder; intercept preview 503 | Warning must disclose uncertainty and deletion should be blocked or explicitly acknowledged; check focus, retry, state recovery. Candidate QA-NEW-02. |
| EXP-02 | Pending intent left on Storage error | Inject signing failure, retry same PDF, inspect DB | No leaked pending reservation, or documented cleanup/retry; compare returned names. Candidate QA-NEW-01. |
| EXP-03 | Mixed multi-upload | Drag 5 PDFs including two identical names, 0-byte, oversize and one interrupted PUT | Per-file progress/error, retry only failed items, no duplicate names, no missing byte integrity. |
| EXP-04 | Delete shared folder while Viewer viewing | Owner and Viewer separate browsers; owner reads preview and deletes disposable nested tree while Viewer navigates | Viewer sees controlled 404/empty; no stale access/content leakage or accidental owner-room redirect. |
| EXP-05 | Old signed URL after revoke | Isolated Supabase bucket; Viewer fetches URL, Owner revokes, test exactly same URL before/after TTL | Capture URL status codes, bytes and expiry **without leaking URL**; classify against agreed policy, not assumption. |
| EXP-06 | Name conflicts and pagination | Disposable folder with multiple same-name uploads, rename/move; pages at limit/limit+1 | Correct disambiguation, no missing/duplicated records, stable breadcrumb. |
| EXP-07 | Accessibility and mobile | Keyboard-only dialog navigation, narrow viewport, upload progress announcements | Logical focus, Escape behavior, labels, no blocking overflow; screenshots + reproducible steps. |

## Session template (copy once per actual exploratory run)

```text
Charter ID:
Tester / UTC datetime:
Build SHA / base URLs / browser version:
Role / disposable test data:
Starting state:
Steps and stimuli:
Actual observed outcome (do not infer):
Expected behavior and requirement/policy source:
Evidence paths: screenshot / trace / sanitized request-response / DB row:
Assessment: PASS | ISSUE FOUND | NEEDS PRODUCT DECISION | BLOCKED
Finding ID, if applicable:
Cleanup evidence:
```

## Evidence checklist for a bug ticket

Title, severity vs priority, environment/revision, preconditions, numbered reproduction, expected vs actual, frequency, impact, raw screenshot/trace/HTTP, affected requirement, workaround, cleanup and confidence/scope. Runtime evidence must not be replaced with GPT-authored interpretations. Preserve only sanitized artifacts in the submission.
