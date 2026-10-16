---
description: Verify the deployed environment - health, CORS, auth, and the share-link flow
---

You are verifying that the deployed Data Room actually works end-to-end. The assignment is graded on the prod URLs, and CORS/env issues are the classic "worked locally" failure.

## Input

`$ARGUMENTS` may contain the frontend and/or API URL. If not provided, ask the user for them once and reuse for the session (do not read `.env` files - they are permission-denied).

## Step 1: API health

```bash
curl -sS -o /dev/null -w "%{http_code}\n" <API_URL>/health
```

Expect 200. A slow first response may mean the Railway instance was asleep - note it; a reviewer will hit the same cold start.

## Step 2: CORS from the frontend origin

```bash
curl -sS -i -X OPTIONS <API_URL>/auth/login \
  -H "Origin: <FRONTEND_URL>" \
  -H "Access-Control-Request-Method: POST" | grep -i "access-control"
```

`access-control-allow-origin` must cover the prod frontend domain. Repeat the check mentally for the storage bucket: direct browser PUT uploads need CORS on the bucket too - if uploads fail only on prod, that's the first suspect.

## Step 3: Auth round-trip

```bash
curl -sS -X POST <API_URL>/auth/login -H "Content-Type: application/json" \
  -d '{"email":"<seed user>","password":"<seed password>"}'
```

Expect a token. A protected endpoint without a token must return 401.

## Step 4: Access-control spot checks (curl, not UI)

- A resource id from another user with a valid token -> **404** (not 403, not 200).
- A `/public/:token/...` endpoint with a valid token but a resource id outside the shared subtree -> **404**.
- A revoked share token -> the "access revoked" response, not content.

## Step 5: Manual incognito pass (report as a checklist for the user)

Register -> create nested folders -> upload several PDFs (watch per-file progress) -> rename/move/delete -> share a folder via public link -> open in incognito, view a PDF -> revoke -> refresh incognito (clear "access revoked" state). Browser console: no errors, no red requests.

## Step 6: Known environment traps

If a check fails, map the symptom before guessing:

- `prepared statement "s0" already exists` (42P05) on any query -> `DATABASE_URL` is the Supabase pooler (6543) without `?pgbouncer=true&connection_limit=1`. Env fix, not a code fix.
- `EADDRINUSE :::3000` -> another process already listens locally; not an app defect.
- CORS error only on prod -> `CORS_ORIGIN` missing the deployed Vercel domain, or the storage bucket lacks CORS for direct browser uploads.
- 500 on every request right after a schema change -> migration not applied on the prod database (`prisma migrate deploy` runs in the `start` script; check the deploy log).

## Step 7: Report

Table of checks with pass/fail. For any failure: the exact command/step, the response, and the most likely fix (CORS origin env, bucket CORS, sleeping instance, missing migration).
