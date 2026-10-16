# v0.6 — read-only discovery and inventory baseline

**Why:** The public demo has no documented initial dataset. On 2026-10-15 the user saw one `Overview.pdf` and multiple apparently empty folders. Neither their original content nor deletions can be inferred from that observation. We must not create/rename/delete anything in a shared demo to set up Lighthouse tests.

## Safety contract

- `qa:discover` issues **one POST `/auth/login`** to obtain a JWT, then **GET-only** requests to `/data-rooms`, `/data-rooms/:id/contents`, `/folders/:id/contents`. It never invokes POST create, PATCH, PUT, DELETE, or Storage write endpoints.
- Uses the OWNER demo account specified in `.env`; token is kept in memory and never included in output files. Root item metadata (IDs, names and paths) is PRIVATE: do not commit or upload reports unredacted.
- Only known official VDR API HTTPS origin and localhost HTTP are accepted by default. Non-default remote staging needs explicit `QA_READONLY_ALLOW_REMOTE=1` and exact `QA_API_APPROVED_ORIGIN`.
- Caps: 40 pages per collection; 200 folders and 3,000 objects total. Exceeding a cap aborts rather than saving a misleading partial inventory.
- Do **not** run mutation suites, load tests, or file uploads on the shared demo. `qa:baseline` creates *a baseline from now onward*, not evidence about earlier contents.

## First run on Ubuntu

Use the extracted `vdr-qa-starter` directory, not the VDR product repo. Preserve your existing `.env` with approved **demo account credentials** only. Ensure it includes:

```dotenv
API_BASE_URL=https://virtual-data-room-production.up.railway.app
WEB_BASE_URL=https://virtual-data-room-ten.vercel.app
OWNER_EMAIL=<demo-owner-email>
OWNER_PASSWORD=<demo-owner-password>
LHCI_WEB_BASE_URL=https://virtual-data-room-ten.vercel.app
LHCI_ALLOW_REMOTE=1
# optional; defaults below
QA_ROOM_NAME=My Data Room
QA_FILE_NAME=Overview.pdf
```

Run:

```bash
npm install
npm run test:framework
npm run qa:discover
```

Successful discovery prints the number of folders and files, and the selected PDF path. It creates:

- `.qa-resources.env` — only `LHCI_ROOM_ID`, `LHCI_FOLDER_ID`, `LHCI_FILE_ID` (no password/token).
- `reports/inventory/latest.json` — readable inventory, object names/paths and counters (**PRIVATE**).

**No manual UUID copying.** Lighthouse and Playwright load `.qa-resources.env` automatically when `LHCI_*` variables aren't already nonempty in your shell or `.env`. Clear old manually entered IDs in `.env` to use auto-discovered values. The first suitable folder is chosen for an empty-folder test; you can choose a specific name with `QA_FOLDER_NAME=1`.

If more than one owned room has the name `My Data Room`, the CLI fails safely; set `QA_ROOM_ID=<exact-room-uuid>` to disambiguate. If several files named `Overview.pdf` exist in the tree, the file UUID remains unset rather than guessing.

## Capture an initial baseline

```bash
npm run qa:baseline
```

This saves `reports/inventory/baseline.json`. **It refuses overwrite.** To take another snapshot and compare:

```bash
npm run qa:discover
npm run qa:diff
```

Read `reports/inventory/diff.json`: new/missing/renamed resources since your baseline. This can also reflect changes by other demo users or changes to permissions — it does not prove our tests deleted anything.

## Lighthouse and Playwright

Assuming Chromium and the sandbox flag are already configured as in v0.4.1:

```bash
LHCI_RUNS=1 npm run lighthouse:check
LHCI_RUNS=1 npm run lighthouse:auth
npm run lighthouse:analyze
npm run test:api -- tests/api/resources.readonly.spec.ts
npm run test:ui -- tests/ui/document-pages.spec.ts
```

You can then run three Lighthouse repetitions with `LHCI_RUNS=3 npm run lighthouse:auth`.

For Lighthouse remote demo, set `LHCI_ALLOW_REMOTE=1`; use `LHCI_CHROME_NO_SANDBOX=1` **only when Chromium sandbox genuinely cannot start**, and only in a disposable machine/user session with trusted test data.

Test files still emit `SKIP` when prerequisites aren't satisfied; skipped checks are **not** passes. If the PDF isn't present or `Overview.pdf` isn't uniquely identified, `LHCI_FILE_ID` will be absent and PDF tests are skipped. This is deliberate, not a fabricated result.

## Results to return

Do not send `.env`, access tokens, the raw `.qa-resources.env`, unredacted LHR HTML, or signed Storage URLs.

For initial diagnosis, share the CLI output (it contains no secrets) and a **redacted** copy of `reports/inventory/latest.json`, removing names/IDs you consider private. Also share `reports/lighthouse/auth/qa-summary.json` and the Playwright pass/fail/skipped counts or sanitized failure traces.
