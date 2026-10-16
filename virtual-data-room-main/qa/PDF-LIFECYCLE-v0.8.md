# VDR QA v0.8 — PDF lifecycle

This delivery extends v0.7 rather than changing VDR product logic. The public demo is **never** used for writes.

## Layer A: NestJS + PostgreSQL + loopback HTTP fake Storage

Requirements: local PostgreSQL `vdr_qa_test` and the existing API Jest dependencies. This layer uses real NestJS HTTP controllers, JWT authorization, Prisma and PostgreSQL; only Supabase Storage is replaced by a loopback HTTP byte store. Unlike the earlier metadata-only mock, this adapter transmits actual PDF bytes through HTTP and confirms SHA-256 on download. **It does not validate Supabase signed upload formats, production storage policy, browser CORS or how real Supabase sets MIME metadata.**

From `virtual-data-room-main/`:

```bash
docker compose -f qa/docker-compose.postgres.yml up -d
cd apps/api
npm ci
cp -n test/qa-env.example test/.env.test
set -a; source test/.env.test; set +a
node test/qa-db-guard.cjs
npx prisma generate
npx prisma migrate deploy
npm run test:qa:integration
npm run test:qa:pdf-lifecycle
# Known defects, expected to fail:
npm run test:qa:known-defects
```

The new lifecycle suite covers:
- Upload intent: pending file invisible, failed completion before actual storage upload.
- Byte-level HTTP upload to the local fake, completion with real PostgreSQL metadata.
- PDF view URL, download URL and SHA-256 match.
- Rename and move without changing storage object or bytes; delete cleans both DB and fake store.
- Unauthorized viewer cannot view, download, rename, move, delete or complete a private PDF.
- USER folder share grants view/download but not mutation, then revoke blocks newly issued URLs.
- Simulated storage delete failure: DB deletion remains successful and an orphan remains (accepted product trade-off, security/storage cost risk).

Cleanup: the harness deletes only its freshly registered test actors, their rooms and objects. The local HTTP fake server stops after each suite. **Do not run these tests against an existing non-QA database.** The database guard fails closed.

## Layer B: Real browser + actual Supabase Storage (optional)

The separate `vdr-qa-starter` contains `tests/ui/pdf-storage-lifecycle.mutation.spec.ts` and `scripts/guard-storage.mjs`. It tests actual React file input, NestJS upload-intent, real signed upload via the browser to a **disposable** Supabase Storage bucket, completion, PDF viewer, SHA-256 downloaded bytes, rename, move and delete. It deliberately mixes UI upload with authenticated HTTP operations for deterministic assertions. It does NOT test simultaneous uploads, error retries with real Storage or the validity of previously-issued signed links after revocation.

**Never use the Vercel/Railway public demo.** Prepare local app servers with LOCAL QA PostgreSQL and a separate throwaway Supabase Storage project. The environment guard checks loopback URLs, acknowledgments and the UUID. It **cannot inspect backend secrets or verify the bucket**; the operator must independently verify that `apps/api` points to the disposable project/bucket and the local QA DB before running.

Prepare frontend environment *before Vite starts*:

```bash
# apps/web/.env.local (local only; use disposable Supabase ANON key)
VITE_API_URL=http://127.0.0.1:3000
VITE_SUPABASE_ANON_KEY=...your_disposable_project_anon_key...
```

Backend requires local QA `DATABASE_URL` / `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_BUCKET`, `SUPABASE_SERVICE_ROLE_KEY` of disposable project, and `CORS_ORIGIN=http://127.0.0.1:5173`; configure `JWT_SECRET`. Apply migrations, run API locally, then `npm run dev -- --host 127.0.0.1 --port 5173` in `apps/web`. Create a dedicated test Data Room owned by OWNER_EMAIL (through local UI). Copy its UUID. **Use no production credentials or secrets.**

In separate shell, from `vdr-qa-starter`:

```bash
npm ci
# Use the pre-existing .env for OWNER_EMAIL/OWNER_PASSWORD, or export variables.
export WEB_BASE_URL=http://127.0.0.1:5173
export API_BASE_URL=http://127.0.0.1:3000
export QA_E2E_ROOM_ID=<UUID-of-disposable-room>
export RUN_MUTATION_TESTS=1
export QA_STORAGE_E2E_ACK=DISPOSABLE_STORAGE_AND_DB_ONLY
export QA_STORAGE_TEST_BUCKET_ACK=I_VERIFIED_DISPOSABLE_BUCKET
export CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chrome
# Credentials must be exported in shell for preflight guard:
export OWNER_EMAIL=...  # QA-only account
export OWNER_PASSWORD=...  # QA-only password
node scripts/guard-storage.mjs
npm run test:qa:storage
```

Local `qa:storage` uses a hardcoded spec path and won't launch other mutation tests. All the user-facing read-only suites retain their prior commands. If upload is interrupted, a pending metadata row may remain. Review the test-only room for leftover `qa-lifecycle-*.pdf` files; cleanup attempts are best effort, never broad deletion. Keep logs and reports private because traces may contain signed URLs and test credentials.

## Two distinct evidence statuses

- New source code, Jest config, safeguards and HTTP fake suite: authored; **runtime integration with your PostgreSQL remains to be confirmed**.
- Browser signed-upload E2E: authored; **not run in this environment** (no disposable Supabase project or running local VDR stack).
- Existing v0.7 (previous user run): 7/7 integration, 8/8 Cypress CT, 9/9 Playwright API, 5/5 Playwright UI; two known defects confirmed (expected-red).

Do not count fake-storage SHA validation as proof that Supabase preserves bytes. The browser E2E provides that evidence only after it passes on the real isolated storage project.
