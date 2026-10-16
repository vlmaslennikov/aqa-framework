# VDR Product QA — reviewer entry point (v0.17)

This artifact is a **Product QA take-home submission**, not a fork that fixes the VDR product. Source under `virtual-data-room-main/` is the archived SUT plus QA tests, and `vdr-qa-starter/` is the reusable automation harness. **Do not publish local `.env` or generated `reports/qa-runs/` without review.**

## Read these first

1. [`vdr-qa-starter/docs/QA-SUBMISSION-v017.md`](vdr-qa-starter/docs/QA-SUBMISSION-v017.md) — concise test strategy, actual outcomes, risks, missing cases, testing pyramid, AI use and delivery verdict.
2. [`vdr-qa-starter/docs/FINDINGS-v017.md`](vdr-qa-starter/docs/FINDINGS-v017.md) — prioritized bugs versus hypotheses and limitations, with reproducible steps.
3. [`vdr-qa-starter/docs/TRACEABILITY-v017.md`](vdr-qa-starter/docs/TRACEABILITY-v017.md) — original functional requirements mapped to tests and verified/unverified status.
4. [`vdr-qa-starter/docs/EXPLORATORY-v017.md`](vdr-qa-starter/docs/EXPLORATORY-v017.md) — exploratory charters and precise provenance of limited historical observations.
5. [`vdr-qa-starter/docs/EVIDENCE-RUNBOOK-v017.md`](vdr-qa-starter/docs/EVIDENCE-RUNBOOK-v017.md) — run suites and produce machine-readable evidence.

## Quick commands (Ubuntu; from this directory)

```bash
make setup                     # installs Node 22.16.0, deps, Chromium, FFmpeg, Cypress, Docker k6 image
make env-qa env-ui             # copies templates only when missing; never overwrites secrets
make postgres-up db-prepare    # LOCAL disposable vdr_qa_test DB only
make qa-evidence-local         # unit, guards, known source-boundaries, Nest integration, PDF, sharing, Cypress
make qa-evidence-browser       # read-only deployed VDR API and Playwright browser checks
```

These commands create a per-run `reports/qa-runs/<UTC timestamp>/summary.md`, `summary.json` and separate logs. A partial/skipped/blocked run is explicitly **not PASS**. Original application unit tests are run separately and clearly identified; they were not authored by the QA engineer.

**Real Supabase Storage E2E:** isolated opt-in only via `make env-storage` and `make test-storage`. It is not part of `qa-evidence-local` or `test-all-safe`.

**Known defects:** `make test-known-unit` verifies two existing source-level validation gaps without a database. `make test-known` intentionally expects failing requirements assertions against a disposable QA PostgreSQL and should not be counted as green product coverage.

The original application's `task.md` prioritizes UX/functionality, polish, and code quality. Product QA coverage additionally prioritizes confidentiality/authorization because VDR documents can be sensitive.
