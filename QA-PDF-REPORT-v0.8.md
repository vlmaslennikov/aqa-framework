**HISTORICAL v0.8 DRAFT — SUPERSEDED EXECUTION STATE.** The user later ran the four PDF lifecycle integration tests on Ubuntu: **4/4 PASS**. The guarded real Supabase Storage E2E remains NOT RUN. For the current status, see [`vdr-qa-starter/docs/QA-SUBMISSION-v017.md`](vdr-qa-starter/docs/QA-SUBMISSION-v017.md).

---

# PDF Lifecycle QA report — 2026-10-16

**Scope:** VDR PDF upload → store → view → download → SHA-256 → rename → move → delete, with role permissions, link revocation and storage failure behavior.

**Baseline available from user's previous Ubuntu logs:** 7/7 Jest integration, 8/8 Cypress component, 9/9 Playwright API, 5/5 UI, plus two known backend defects (expected-red); they are not rerun here.

**New work delivered:** 4 NestJS+PostgreSQL HTTP integration scenarios using a loopback HTTP byte store, and 1 guarded browser-to-disposable-Supabase E2E path. The new runtime tests are *not yet verified* on live dependencies. Only framework guard tests and source validations passed in this environment.

| ID | Test / risk | Test level | Evidence status |
|---|---|---|---|
| PDF-01 | Pending upload stays invisible; completion before object exists rejects | Local integration | Authored, not run |
| PDF-02 | Upload and download byte-level SHA-256 match | Local integration with HTTP fake Storage | Authored, not run |
| PDF-03 | Rename/move preserve content and storage key | Local integration | Authored, not run |
| PDF-04 | Owner delete removes row and Storage fake object | Local integration | Authored, not run |
| SEC-01 | Unshared viewer denied view, download, rename, move and delete | Local integration | Authored, not run |
| SEC-02 | Folder sharing grants read but not mutation; revoke denies new URLs | Local integration | Authored, not run |
| RISK-01 | Previously signed 5-minute URLs can remain valid after revoke | Design risk; not changed in this QA work | Pending dedicated expiry check |
| RISK-02 | Storage delete failure leaves orphan object while DB row deleted | Local integration asserts documented behavior | Authored, not run |
| E2E-01 | Real React → signed Supabase PUT → complete → download SHA-256 | Isolated browser + storage E2E | Authored, not run |
| BUG-001 | Whitespace-only account name accepted | Existing known-defect test | **Previously reproduced by user**, HTTP 201 vs 400 |
| BUG-002 | Actual storage size > 50 MiB accepted on completion | Existing known-defect test with mocked Storage size | **Previously reproduced by user**, HTTP 201 vs 400; real exploitability unverified |

**Release recommendation:** no change. Product QA coverage of access and file integrity is improving, but actual isolated signed-storage E2E, deletion/revocation/expiry boundary tests, performance at scale and exploratory behavior remain incomplete. Do not claim production approval from the new tests until run evidence is supplied.
