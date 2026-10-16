# VDR Product QA v0.20 — one entry point

This archive is a QA assessment of the original VDR MVP, not a rewrite of its product functionality. `virtual-data-room-main/task.md` provides the original product requirements. The QA practical asks to test the product, document prioritized findings and missing cases, automate valuable scenarios, and demonstrate the start of a reusable testing pyramid.

## No manual env copying

The **root `.env`** is the canonical noncommitted input. `make setup` generates six QA env files and installs Node 22.16, package dependencies, Chromium/FFmpeg, Cypress and Docker k6. For an already installed v0.19, run `make env-sync` once. `make qa-doctor` prints a **secret-free diagnosis**.

- `WEB_BASE_URL` and `API_BASE_URL` from the root file apply to **read-only** browser/API tests on the public demo. `OWNER_*` and `VIEWER_*` credentials are used only for those approved read-only tests.
- `VITE_API_URL=http://127.0.0.1:3100` is the **local** API target. The integration suite accesses `vdr_qa_test` on loopback PostgreSQL and uses fake Storage.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the root file are **not** trusted for destructive tests. The Supabase S3-compatible URL path `/storage/v1/s3` should not be assumed to be the SDK project base URL. Dedicated `QA_TEST_SUPABASE_URL`, `QA_TEST_SUPABASE_SERVICE_ROLE_KEY` and `QA_TEST_SUPABASE_BUCKET` are required for an isolated real-storage test, together with an explicit human acknowledgement.
- `LHCI_WEB_BASE_URL`, `LHCI_ALLOW_REMOTE` and `LHCI_RUNS` from the root `.env` now propagate to the QA environment. Chrome paths are autodetected by the Make wrapper.
- `.env` files and reports are excluded from version control. **Never paste raw keys or passwords into public QA artifacts.** Rotate any genuine service key exposed outside an approved secret channel.

## Commands

```bash
make setup                       # first install; syncs six env files
make qa-doctor                   # no secrets printed, no network
make postgres-up db-prepare     # destructive tests: ONLY isolated vdr_qa_test
make qa-evidence-local          # product unit/integration/component, known defect boundary
make qa-evidence-browser        # public read-only API + UI
make qa-report                   # regenerate evidence-backed Product QA dashboard
```

Current combined report: `reports/product-qa/latest.md`. For raw evidence see `reports/qa-runs/<timestamp>/summary.json` and individual logs. `qa-report` explicitly marks absent suites as NOT RUN, and documents which claims rely on mocked Storage. A successful known-boundaries test means the **bug remains reproducible**, not that it is fixed. `make test-known` is expected red on the current app code.

## Main product findings (do not confuse status)

- QA-AUTH-06 — whitespace-only display names accepted; local HTTP observed 201 vs expected 400 (P2).
- QA-FILE-02 — server accepts oversized actual Storage metadata during completion (conditional P1, fake Storage proof; real bucket not tested).
- QA-OPS-08 — orphan object after DB row deletion and Storage failure (observed fake-Storage behavior; cleanup policy needed).
- QA-SEC-01 — how previously signed URLs behave after sharing revoke (investigation/policy decision, not confirmed requirement violation).
- QA-OPS-04 abandoned upload expiry and QA-AUTH-05 JWT revocation are product-policy limitations; optional search/versioning are **not** mandatory defects.

See `vdr-qa-starter/docs/FINDINGS-v017.md`, `TRACEABILITY-v017.md`, and `EXPLORATORY-v017.md`. Those historical docs are retained for provenance; the generated `qa-report` supersedes their old execution statuses.

## Honest evidence boundary

Previously supplied Ubuntu logs (2026-10-16) indicated 42/42 upstream unit, 7/7 core integration, 4/4 PDF lifecycle, 4/4 requirements, 6/6 sharing, 8/8 Cypress component, and 7/7 UI in one v0.18 run; API was 6/9 with 3 skips. v0.19 made further fixes but no fresh combined Ubuntu manifest is bundled. Do **not** count tool unit/guard tests as product tests or historical results as a fresh same-run CI pass.

Remaining high-value work: real isolated Supabase upload/download SHA-256; multi-file drag/drop/failure; signed URL replay/TTL after revoke; deleting folder during another user's navigation; keyboard/mobile exploratory evidence; bounded scalability performance dataset. Do not write to the publicly shared VDR demo.
