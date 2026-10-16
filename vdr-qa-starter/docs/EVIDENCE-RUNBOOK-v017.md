# Reproducible QA evidence — Ubuntu runbook (v0.17)

This file is for producing a **new** report; static historic documents must not be stamped PASS for a new version.

## 1. Prepare dependencies and isolated DB

From archive root (`Makefile` lives here):

```bash
make setup                 # nvm Node 22.16.0, npm ci, Chromium + FFmpeg, Cypress, Docker k6
make env-qa env-ui         # creates missing local .env files only
make postgres-up
make db-prepare             # guard: only 127.0.0.1/vdr_qa_test
```

Populate `vdr-qa-starter/.env` with README **test** `OWNER_EMAIL` and `OWNER_PASSWORD` for read-only API/UI. Never paste credentials into the report. If needed, `make qa-discover` finds existing test room, folder and PDF UUIDs without mutations.

**Warning:** product mutation suites run only on the disposable local PostgreSQL; external Storage is faked. Never redirect those suites to Vercel/Railway. Public API and browser suites are read-only. `test-storage` requires separate disposable private Supabase and explicit opt-in; it is not included in the automatic evidence runner.

## 2. Capture full testing pyramid, no silent green skips

```bash
make qa-evidence-local
make qa-evidence-browser
```

- `qa-evidence-local`: original source-unit tests, QA framework checks, DB safety checks, database-free reproductions of two known defects, local NestJS integration, PDF lifecycle, naming/pagination/delete preview, six-case sharing matrix and 8 Cypress component tests.
- `qa-evidence-browser`: read-only Playwright API + UI with fresh auth and content checks. Includes new PDF byte-header check; does not upload/delete public content.
- In both modes the command **continues to the next suite after a failure** and records the status for every suite. Incomplete/failed runs return nonzero and are not counted as complete.
- Output is written to `reports/qa-runs/<UTC timestamp>/` in the **archive root**, with `summary.json`, `summary.md` and per-suite `.log` files. These logs are local-only and excluded via `.gitignore`.

The reporter distinguishes `PASS`, `PARTIAL`, `SKIPPED`, `BLOCKED`, `FAIL`, `INCONCLUSIVE`, and `FINDINGS_REPRODUCED`. A 5-skipped run is **SKIPPED**, not PASS. The last status means product bugs were reproduced at the boundary, not that the VDR met the requirement.

**Raw logs and JSON may include sensitive diagnostic details** despite best-effort sanitization; inspect before sharing. Do not commit `.env` files, passwords, JWTs or pre-signed URLs.

## 3. Run expected-red HTTP repro separately

```bash
make test-known-unit      # database-free; PASS signifies two current validation gaps observed
make test-known           # DB-based; SHOULD FAIL requirements assertions (HTTP 201 instead of 400)
```

Record exact request conditions/statuses and whether both defects remain. `make test-known` exits nonzero for an actual mismatch. Do **not** use `|| true` in a release gate. The explicit expected-red output should be attached to the Findings section; a new 400 requires regression reclassification and independent verification, not "2 green bugs".

## 4. Exploratory and real Storage E2E

Follow `EXPLORATORY-v017.md` and the isolated Storage instructions `docs/qa-storage-e2e-v08.md`; `make env-storage` and `make test-storage` are opt-in. Capture SHA-256, browser traces, test bucket and cleanup evidence. For revoke behavior, capture status codes without ever publishing the original signed link.

## 5. Interpret the result

- `summary.md` is the same-run factual report; `QA-SUBMISSION-v017.md` is the assessment covering historic evidence and untested risks.
- `FINDINGS-v017.md` maintains issues and pending investigations, separate from test pass counts.
- Environment, Git SHA (if archive is not Git this is reported unknown), Node version and source task fingerprint are included in the JSON. Note that Git SHA of the live deployment remains unknown unless supplied by operator.
- If `make qa-evidence-browser` reports BLOCKED, check missing credentials/discovery and Chromium before asserting a UI defect.
- k6 and Lighthouse require separate runs and independently versioned evidence; no performance numbers should be inferred from smoke PASS.
