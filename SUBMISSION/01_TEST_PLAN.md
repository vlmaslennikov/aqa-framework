# Short test plan

**Goal.** Assess whether the Virtual Data Room allows authorized users to manage and share documents safely and intuitively. The original `task.md` prioritizes **UX/functionality and edge/error states first**, then design/polish, then code quality. For confidential deal documents, unauthorized disclosure and destructive data operations also carry high risk.

**Environments/data.** Public Vercel/Railway demo: existing README test accounts; **read-only** API/UI exploration. Local NestJS + dedicated PostgreSQL `vdr_qa_test`: isolated owner/viewer accounts, seeded folder trees, fake byte-preserving Storage. Browser-to-Supabase mutation: only against an explicitly approved disposable bucket. Use deterministic PDF fixture and record versions, browser, URLs, UTC time, account role, outcome and screenshots/traces; redact secrets/signed URL query strings.

| Priority | Requirement / risk | Minimum scenarios | Main level | Exit oracle |
|---|---|---|---|---|
| P0 | Authentication / isolation | Login, wrong password, anonymous access, known UUID cross-account access | Unit, API, browser | Unauthorized read/write blocked |
| P0 | Scoped sharing / revoke | DataRoom, folder, file × USER and PUBLIC_LINK; nested descendants; sibling/ancestor isolation; revoke | Integration, API | Read only in scope; revoked share cannot mint new access URL |
| P1 | Folder lifecycle / destructive UX | Create/nest, list/breadcrumbs, rename/conflicts, preview before deleting subtree | Integration, browser, exploratory | Correct counts and warning, no accidental destruction |
| P1 | PDF lifecycle | Multiple upload/DnD/per-file progress, failure/retry, inline view, download, rename/move/delete | Component, integration, E2E | User receives clear state, byte integrity maintained |
| P1 | File validation / recovery | At size limit and +1, invalid type, upload URL failure, Storage deletion failure | Unit, integration, exploratory | No invalid completed records or silent irreversible failure |
| P2 | UX/accessibility | Empty/invalid forms, keyboard focus, responsive layout, stale shared view, expired links | Manual, component, browser | Usable clear errors and predictable navigation |
| P2 | Large collections | Pagination/cursors, 100k metadata dataset, bounded local load | Integration, k6 | No data loss/duplication; timings recorded |

**Techniques.** Decision-table matrix for permissions; equivalence classes and 0/1/limit/limit+1 boundaries; upload/share state transitions; negative HTTP contract checks; exploratory failure injection; source-assisted test design. Favor integration/component checks for complex combinations; keep E2E small and high value.

**Exit criteria.** Critical confidentiality scenarios executed with evidence; P0 findings resolved/accepted; P1 issues triaged; end-to-end Storage proof available before unrestricted production approval. This partial take-home explicitly lists what has not met those criteria. Search/versioning are optional, not defects.

**Manual exploratory charters still to execute:** Viewer navigates a folder during Owner deletion; previously issued signed URL after revocation and after expiry; three-file DnD batch with duplicate/failing item; network interruption mid-upload; deletion preview returning 503; keyboard/mobile interaction. These are **planned charters, not completed sessions**.
