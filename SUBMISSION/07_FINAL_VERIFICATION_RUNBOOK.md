# Final verification — executable runbook (not a test result)

**Scope:** full API 9/9, exploratory charters, isolated real Storage upload and SHA-256, URL revocation observation.

## A. Public read-only tests — do first

From the project root with the real demo credentials in the root `.env`:

```bash
make env-sync
make qa-doctor
make qa-evidence-browser
```

The Playwright API run must report **9 passed / 0 skipped / 0 failed**. The UI run now includes 4 exploratory charters (invalid public URL, anonymous protection, mobile form validation, simulated 410 UX) in addition to existing smoke tests. Screenshots are Playwright attachments in `vdr-qa-starter/test-results/` or HTML report. The 410 test uses a **mocked** response and does **not** prove real revoke semantics.

**Collect:** `reports/qa-runs/<timestamp>/summary.json`, `reports/qa-runs/<timestamp>/*.log`, `vdr-qa-starter/reports/playwright/results.json`, and the HTML report. Review screenshots for private names or identifiers before sharing. Never attach `.env`, tokens or signed URLs.

## B. Local disposable Supabase — safety setup

Do **not** point the test at the public Vercel/Railway demo. Do **not** use a shared bucket.

In the *root* `.env`, add/verify these values using your own test Supabase project:

```dotenv
QA_TEST_SUPABASE_URL=https://<isolated-project-ref>.supabase.co
QA_TEST_SUPABASE_SERVICE_ROLE_KEY=<secret-for-that-isolated-project>
QA_TEST_SUPABASE_BUCKET=<dedicated-private-test-bucket>
QA_STORAGE_TEST_BUCKET_ACK=I_VERIFIED_DISPOSABLE_BUCKET
QA_STORAGE_E2E_ACK=DISPOSABLE_STORAGE_AND_DB_ONLY
QA_VITE_SUPABASE_ANON_KEY=<public-or-anon-key-from-same-test-project>
QA_STORAGE_WEB_BASE_URL=http://127.0.0.1:5173
QA_STORAGE_API_BASE_URL=http://127.0.0.1:3100
```

**Important:** `SUPABASE_URL=https://...storage.supabase.co/storage/v1/s3` is an S3-compatible endpoint, **not** the Supabase project URL expected by `@supabase/supabase-js`. It cannot be used as the backend `QA_TEST_SUPABASE_URL`.

The Make env-sync script ignores root production service-role keys and database URLs for local destructive tests. The local DB is always `vdr_qa_test`.

Make sure CORS on the Supabase test project allows your local frontend origin, and the bucket has the needed upload/download permissions for signed URLs.

## C. Start isolated web + API in two terminals

```bash
# terminal 1, project root
make env-sync
make postgres-up
make db-prepare
make api-dev
```

```bash
# terminal 2, project root
cd virtual-data-room-main/apps/web
npx vite --host 127.0.0.1 --port 5173
```

The local backend must have loaded `apps/api/test/.env.test`, and the frontend must be using `apps/web/.env.local`. You may need `nvm use` in terminal 2.

## D. Real E2E — third terminal

```bash
make test-storage
```

The guarded E2E creates a **new disposable local user and room**, uploads a real valid PDF through React, confirms it through NestJS, downloads and compares SHA-256, renames/moves/deletes its own file. It also creates its own PUBLIC_LINK share, revokes it, and attaches `signed-url-revocation-observation.json` recording whether the **old** URL remains valid immediately after revoke. It neither logs nor attaches signed URL tokens.

**Do not mark old signed URL validity as a bug without a product decision.** The currently generated URL has a 5-minute TTL. This run only observes immediate post-revoke behavior, not expiry after the TTL.

If the run is BLOCKED, record why. Never turn off the guard or use a production bucket to force a green result.

## E. Evidence checklist / result classification

- `PASS`: current run, checked assertions, zero skipped.
- `PARTIAL`: at least one test skipped.
- `FINDINGS_REPRODUCED`: expected-red defects observed, not product acceptance pass.
- `BLOCKED`: unavailable local service/bucket/browser or missing credentials.
- `NOT RUN`: no execution evidence exists.

Only update submission report after capturing actual result logs and evidence attachments. 
