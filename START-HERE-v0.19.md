# VDR Product QA v0.19 — evidence parser & browser preflight fix

**Base:** full v0.18 archive. No VDR business code changed. Your private `.env`, `.env.test`, `.qa-resources.env` and local PostgreSQL are NOT included in either deliverable.

## What was broken

- Node.js produces `# tests / # pass / # fail` (TAP) when captured by a subprocess, whereas the v0.18 evidence aggregator only recognized terminal-style `ℹ tests / ℹ pass / ℹ fail`. Consequently `qa-framework` and `qa-guards` appeared as FAIL, despite successful tests.
- The `test-guards` Make target executes two `node --test` commands, requiring count aggregation across two complete summaries rather than reading only one.
- `qa-evidence-browser` executed API tests before the UI preflight discovered required room/folder/PDF UUIDs. This could yield `PARTIAL (6/9)` despite the subsequent UI suite passing.

## Corrections

1. `scripts/qa-evidence.mjs`: parse both Node.js TAP (`#`) and spec (`ℹ`) summary forms, aggregate multiple completed test-runner reports, reject incomplete/failed blocks, keep distinction between `PASS`, `PARTIAL`, `BLOCKED`, `FAIL`, and `FINDINGS_REPRODUCED`.
2. `Makefile` `test-api`: execute the **existing read-only** `ui-preflight.mjs` before API tests. It loads current test credentials and discovers only test-owned room/folder/file IDs when needed, or clearly fails if unavailable. No remote mutations are performed.
3. Five new evidence regression tests. Version metadata in `vdr-qa-starter/package.json` and lockfile synchronized to v0.19.0; no dependency version changes, so `npm ci` should not be required for the overlay.

## Safe usage

**Overlay for existing v0.18** (run from v0.18 directory):

```bash
unzip -o /path/to/vdr-qa-v0.19-evidence-overlay.zip
make test-framework
make test-guards
make qa-evidence-local
make qa-evidence-browser
```

All four commands are separate. `make qa-evidence-local` uses the protected **local** PostgreSQL `vdr_qa_test` for integration suites, and `make qa-evidence-browser` uses **read-only** API/UI checks against the configured origin. `env-sync` is called automatically and preserves protected environment behavior. Public demo modification and real Supabase mutation are excluded.

The summary is saved to `reports/qa-runs/<UTC timestamp>/summary.json` and `summary.md`. A `COMPLETE` run means all **selected tests were executed and classified**, **not** that the product is bug-free or approved for release. Known defects remain in `FINDINGS_REPRODUCED` and must remain open in the findings register.

Expected local test counts on current test sources, **not claims about your next execution**: `product-unit 42`, `qa-framework 84`, `qa-guards 8`, `known-boundaries 2 reproduced`, `api-integration 7`, `pdf-lifecycle 4`, `requirements 4`, `sharing-matrix 6`, `cypress-components 8`. Browser: `playwright-api 9`, `playwright-ui 7` if required test resources are available.

## Local validation carried out when packaging

- QA Framework unit tests: 84/84 PASS under Node 22.16.0 (piped TAP).
- Local QA DB and performance guard unit tests: 8/8 PASS under Node 22.16.0 (piped TAP).
- Evidence parser correctly returns PASS and counts from those two real TAP logs.
- Syntax validation and Make dry-run: PASS.

Product integration/browser tests were **not re-executed** in this packaging environment; prior results above came from user-supplied Ubuntu logs.
