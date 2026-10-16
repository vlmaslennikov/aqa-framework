# VDR QA v0.18 — one root `.env`, automatic configuration

This release consolidates environment setup after the v0.17 evidence report showed `Missing .../apps/api/test/.env.test` and several tests could not start.

## One-time configuration

Put your existing **read-only VDR testing credentials** in the existing root `.env` (the same folder as `Makefile`):

```dotenv
OWNER_EMAIL=your-existing-demo-test-account@example.test
OWNER_PASSWORD=your-existing-demo-test-password
# Optional: a separate Viewer account
VIEWER_EMAIL=
VIEWER_PASSWORD=
```

If these keys are already present, there is nothing to add. Root aliases also work: `QA_OWNER_EMAIL`, `QA_OWNER_PASSWORD`, `TEST_OWNER_EMAIL`, `TEST_OWNER_PASSWORD`. Missing credentials **cannot be generated from the source code**; the tool reports missing key names, never guesses or prints passwords.

To override the read-only target, set `WEB_BASE_URL` and `API_BASE_URL` in the same root `.env`. Defaults remain the original VDR public demo. If you select an unknown remote API, the existing read-only origin guard requires `QA_READONLY_ALLOW_REMOTE=1` plus an exact `QA_API_APPROVED_ORIGIN`. Do not use these opt-ins for unapproved hosts.

Run once:

```bash
make setup
```

No more `make env-ui env-qa env-k6 env-browser`: setup automatically calls `env-sync`. For an existing installation, or after changing root `.env`:

```bash
make env-sync
```

All test commands that require an environment also call `env-sync` automatically, so no manual copying is needed.

## Generated files

| Generated path | Purpose |
|---|---|
| `vdr-qa-starter/.env` | Read-only API/UI credentials, room selection, browser targets |
| `virtual-data-room-main/apps/api/test/.env.test` | Local disposable PostgreSQL and NestJS QA variables |
| `.env.k6` | Docker k6 configuration (Make-readable) |
| `.env.browser` | Lighthouse browser sandbox flag; Chrome binary auto-detected |
| `vdr-qa-starter/.env.storage` | Guarded storage E2E settings; *disabled* without explicit root opt-ins |
| `virtual-data-room-main/apps/web/.env.local` | Local Vite web application API URL and test anon key |

Generated files use mode `0600` and are untracked by `.gitignore`. Root `.env` itself is never overwritten. Other local secret values are preserved where no root override is specified; root values have priority for declared QA keys.

**Database isolation:** production `DATABASE_URL`/`DIRECT_URL`/`JWT_SECRET`/`SUPABASE_SERVICE_ROLE_KEY` from root `.env` are **not** reused by QA. Local integration uses `postgresql://qa:qa_local_only@127.0.0.1:54329/vdr_qa_test`. To use another *local QA database only*, set `QA_DATABASE_URL` and `QA_DIRECT_URL` in root `.env`; the generator and existing DB guard both reject production hosts and databases not named `vdr_qa_test`.

**Real Storage E2E:** intentionally not enabled by default. Only if you control a disposable Supabase setup, put `QA_TEST_SUPABASE_URL`, `QA_TEST_SUPABASE_SERVICE_ROLE_KEY`, `QA_TEST_SUPABASE_BUCKET`, `QA_STORAGE_E2E_ACK=DISPOSABLE_STORAGE_AND_DB_ONLY`, and `QA_STORAGE_TEST_BUCKET_ACK=I_VERIFIED_DISPOSABLE_BUCKET` in root `.env`. The E2E still requires the local QA frontend/backend and its own guard. The tool will not implicitly use the production Supabase role key.

**Performance:** Docker k6 uses `http://127.0.0.1:3100` by default, matching local NestJS. Set `QA_API_PORT` in root `.env` if you need a different local API port; generator updates both the local NestJS configuration and the k6 URL. Heavy workloads still require their separate explicit acknowledgement.

## Recommended workflow

```bash
make setup            # installs pinned Node/npm/Cypress/Chromium/FFmpeg + docker k6 and generates all envs
make env-sync         # optional: refresh after changing root .env
make postgres-up
make db-prepare
make qa-evidence-local
make qa-evidence-browser
```

`make db-prepare` uses the isolated PostgreSQL and may create test records. `make qa-evidence-local` also runs isolated database integration suites. `make qa-evidence-browser` is read-only; it may show BLOCKED if demo account credentials are not set or resource discovery is ambiguous. Never run mutation/storage E2E against the public demo.

**Known limitation:** this change only fixes automatic environment generation. If `qa-evidence-local` reports `FAIL` for standalone-green framework/guard tests, inspect the run's `qa-framework.log` or `qa-guards.log` under `reports/qa-runs/` to identify the separate cause; a `PASS` is not asserted without that evidence.
