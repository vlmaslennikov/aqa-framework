# VDR requirement → test → result → finding (v0.17)

**Product source:** `virtual-data-room-main/task.md` (required functionality first; optional search/versioning excluded from defect counts). **QA deliverables:** the user's Product QA Practical Assignment. **Evidence states:** `PRIOR_PASS` (prior user run, not current CI), `PRIOR_DEFECT`, `WRITTEN_UNRUN`, `EXPLORATORY_REPORTED`, `NOT_RUN`; do not interpret authorship as execution.

| Requirement ID | MVP requirement / acceptance oracle | Test(s) | Evidence | Linked finding / remaining gap |
|---|---|---|---|---|
| AUTH-01 | Email/password auth; invalid password denied | `qa-core.int-spec.ts`; `tests/api/auth.readonly.spec.ts`; `tests/ui/login.spec.ts` | PRIOR_PASS; strengthened UI 401/visible error WRITTEN_UNRUN | — |
| AUTH-02 | Required fields report errors | `tests/ui/login.spec.ts` | EXPLORATORY_REPORTED; UI automation WRITTEN_UNRUN | Need fresh screenshot/trace |
| AUTH-03 | Display name is meaningfully nonblank | `qa-known-defects.int-spec.ts`; `qa-known-boundaries.spec.ts` | PRIOR_DEFECT (201 instead of 400); DB-free boundary authored | QA-AUTH-06 |
| FOLD-01 | Create/nest folders, rename; sibling conflicts rejected | `qa-requirements.int-spec.ts` | WRITTEN_UNRUN | Include concurrent creation experiment |
| FOLD-02 | Folder listing and breadcrumbs, stable pagination | `qa-requirements.int-spec.ts`; browser folder smoke | PRIOR_PASS for smoke, new boundary WRITTEN_UNRUN | Verify `limit`, cursor, pending filtering |
| FOLD-03 | Warn accurately before subtree deletion, remove nested records | `qa-requirements.int-spec.ts`; `qa-core.int-spec.ts` | PRIOR_PASS for basic deletion; new exact preview WRITTEN_UNRUN | Explore deletion while shared Viewer is inside |
| FILE-01 | Multi-file PDF upload, drag/drop, per-file progress | `upload-panel.cy.tsx`, guarded storage E2E | PRIOR_PASS 4 component cases; live browser storage NOT_RUN | No actual multi-file browser evidence |
| FILE-02 | View PDF inline and download bytes | `pdf-viewer.cy.tsx`; `qa-pdf-lifecycle.int-spec.ts`; `document-pages.spec.ts` | PRIOR_PASS component + mocked Storage hash; NEW live read-only PDF-body test WRITTEN_UNRUN | Live PDF SHA-256 against original requires isolated upload |
| FILE-03 | Rename/move, name collision policy; no overwrite | `qa-pdf-lifecycle.int-spec.ts`, `qa-requirements.int-spec.ts` | PRIOR_PASS basic PDF lifecycle; conflict WRITTEN_UNRUN | — |
| FILE-04 | Delete files; storage cleanup policy | `qa-pdf-lifecycle.int-spec.ts`, guarded storage E2E | PRIOR_PASS observed mock deletion failure behavior | QA-OPS-08 / retry decision |
| FILE-05 | Max PDF size enforced throughout upload lifecycle | `qa-known-defects.int-spec.ts`, `qa-known-boundaries.spec.ts` | PRIOR_DEFECT with mocked Storage | QA-FILE-02 / real Supabase limit NOT_RUN |
| SHARE-01 | Read-only scoped sharing: USER for room/folder/file | `qa-sharing-matrix.int-spec.ts`, `qa-core.int-spec.ts` | Narrow prior integration PASS; full matrix WRITTEN_UNRUN | New suite must pass |
| SHARE-02 | Public link room/folder/file, anonymous read within scope | `qa-sharing-matrix.int-spec.ts` | Narrow public link prior PASS; full matrix WRITTEN_UNRUN | New suite must pass |
| SHARE-03 | Revocation blocks new read access | `qa-core.int-spec.ts`, `qa-sharing-matrix.int-spec.ts` | PRIOR_PASS for new requests; full matrix WRITTEN_UNRUN | QA-SEC-01 outstanding preissued URLs |
| NFR-01 | UX error states, polish, responsive | `EXPLORATORY-v017.md`, UI/Cypress, Lighthouse | EXPLORATORY_REPORTED limited; visual/mobile NOT_RUN | Original task prioritizes UX |
| NFR-02 | Sensible pagination/indexing at 100k files | Guarded k6 local, `qa-requirements.int-spec.ts` | k6 raw evidence unavailable; boundary WRITTEN_UNRUN | Capacity unverified; don't extrapolate |
| OPT-01 | Search/versioning | Upstream labels optional | NOT_REQUIRED | Not a defect if absent |

## Decision on status counting

Historical 7/7, 4/4, 8/8, 9/9 and 5/5 were separate user-observed runs. New tests must be rerun; never add the historical totals to the current execution total unless a traceable new complete run exists. Run manifests (new data) are created only by `make qa-evidence-local` and `make qa-evidence-browser`.

`QA framework unit` and existing product unit tests are distinct layers and authorships. Passing `known-boundaries` means the unsafe behavior is **still reproducible**; it does not close a bug.
