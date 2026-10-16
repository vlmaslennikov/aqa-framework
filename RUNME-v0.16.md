# VDR QA v0.16 — requirements-first integration and traceability

Baseline: `vdr-qa-framework-v0.15-consolidated.zip` from the other ChatGPT chat. This release preserves v0.12–v0.15 fixes, including Node 22.16.0, user-only `make setup`, automatic Chromium/FFmpeg paths, non-mutating Playwright collection, disposable Storage E2E, Docker k6 and the v0.14 analyzer correction.

## What changed

- `virtual-data-room-main/apps/api/test/qa-requirements.int-spec.ts` (4 tests)
- `virtual-data-room-main/apps/api/test/qa-sharing-matrix.int-spec.ts` (6 parameterized tests)
- Both Jest configs; backend package scripts; root `Makefile` and `.github/workflows/qa-integration.yml` updated.
- `vdr-qa-starter/tests/ui/login.spec.ts` stronger negative login + new empty login case; UI preflight now reports 6 browser cases.
- `vdr-qa-starter/docs/requirements-traceability-v016.md` and `qa-checkpoint-v016.md` distinguish confirmed failures, accepted limitations and unrun coverage.

## Apply without losing local secrets

The overlay archive contains **only changed files**, paths relative to project root. Extract it at the root of the existing installation; do not remove `.env`, `.env.test`, `.env.storage` or locally produced evidence. Keep a backup of customized Makefiles before replacing them.

## Run

```bash
make node-version
make test-framework
make db-prepare
make test-requirements
make test-sharing
make test-ui
```

The new integration tests use isolated local `vdr_qa_test` and mock only external Supabase Storage; `make test-ui` is read-only on the deployed demo. For all safe tests: `make test-all-safe`. The expected-red defect cases are separate: `make test-known`.

## Validation boundary

This archive was statically checked and the QA Framework's 66 existing Node tests passed locally. **The 10 new PostgreSQL tests and UI browser changes have not been executed here** because product dependency installation and database/browser execution were unavailable. Please send test outputs; a `PASS` is not claimed until execution evidence exists.
