# Test Plan — Virtual Data Room

**Status:** Partial previous execution reported; critical UI/storage verification pending. **Target:** README-linked deployed web/API. **Date:** 2026-10-15.

## Product goal and release-critical invariants

A Virtual Data Room must enforce that: (1) unshared data cannot be accessed across users, (2) shares convey read-only permissions to exactly the resource and descendants, not parents or siblings, (3) revocation blocks new access, (4) uploads and operations do not corrupt or lose documents.

## Scope and priority

| Priority | Area | Scenario / oracle | Level | Test IDs |
|---|---|---|---|---|
| P0 | Authentication | Anonymous and wrong-password access denied; valid login succeeds | API + E2E | A01–A03 |
| P0 | Tenant/user isolation | User B cannot read/mutate private User A resources via known UUIDs | API | S01 |
| P0 | Scoped sharing | Shared folder grants nested read, not parent/sibling or mutations | API + E2E | S02–S04 |
| P0 | Revocation | Access to resource denied after share revoked; cached URLs checked separately | API + manual | S05–S06 |
| P1 | Files | PDF upload, multiple files, DnD/progress, view/download, rename/move/delete | UI + API | F01–F07 |
| P1 | Data integrity | Nested folder deletion preview counts, warning, cascade deletion, cleanup | API + manual | D01–D03 |
| P1 | Validation | Blank name, duplicates, 50 MB max, disallowed MIME, invalid cursor | API | V01–V05 |
| P2 | UX / state | Refresh, navigation, error states, responsive UI, keyboard, switch users | E2E + exploratory | U01–U06 |
| P2 | Reliability | Upload interrupted, storage failure, network timeout, pagination boundaries | integration + exploratory | R01–R05 |
| P3 | Optional | Search and version history explicitly outside mandatory scope | Not a release blocker | O01 |

## Test design techniques

Equivalence partitioning and boundaries (0/1/50 MB/50 MB+1, blank/long names), state transitions (upload intent → storage PUT → completion, share active → revoked), decision table (owner/viewer/anonymous/public token × resource type × operation), risk-based exploratory tours, concurrency probes, API negative testing and a few high-value browser journeys.

## Test data and environments

- Use preexisting README accounts for read-only tests; do not delete or overwrite their data.
- Run mutation tests ONLY in an explicitly approved, disposable environment. A fresh test user is created to guarantee access isolation. Account/room cleanup is not available through this API: isolate or reset environment after runs.
- A deterministic test PDF fixture, e.g. 1-page minimal PDF, is recommended for upload tests. Do not upload confidential real documents.
- Record browser, date/time, environment URL, SUT commit SHA, test account roles and actual results.

## Entry / exit criteria

Entry: URLs responding; QA accounts available; shared agreement on delete/reset boundaries. Exit: all P0 tests executed; no unresolved P0; P1 findings assessed and accepted/fixed; key journeys exercised; report includes evidence, residual risk and scope not covered. Security gate is stricter than UI polish.

## Explicit exclusions and constraints

Do not run unapproved load tests, fuzzing, large upload bypass probes, or destructive test suites against the shared public demo. Dynamic security conclusions require reproduction; static source-analysis observations are labeled separately. The existing NestJS/Jest unit suite belongs to the SUT; execute and extend it in a fork/CI only with permission.

Additional artifacts: `docs/permission-matrix.md`, `docs/exploratory-charters.md`, `docs/qa-report.md`. The previous execution transcript is not a substitute for attached raw test evidence.

## Additional non-functional coverage (v0.4)

| Priority | Scenario | Tool | Acceptance/limitation |
|---|---|---|---|
| P2 | Login/Register lab performance and accessibility | Lighthouse CI | 3 runs, baseline scores warn-only, ensure intended route was audited |
| P2 | Authenticated Dashboard/Shared with me | Lighthouse CI + Puppeteer | Private test account, verify JWT + no redirect, no failed API loading state |
| P2 | Authenticated `/room/:id` | LHCI optional explicit ID | User's own seeded test room, not arbitrary public share token |
| P2 | SPA navigation from Dashboard → Shared with me | Lighthouse User Flow | Timespan/snapshot report; no standard nav LCP/overall performance score |

Unlighthouse route crawling is deferred because VDR routes are private/dynamic. k6 is a separate load-testing proposal, not included in this Lighthouse increment.
