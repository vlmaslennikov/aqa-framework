# VDR QA v0.10 — Docker k6 + reproducible Make commands

This bundle contains two sibling projects (`virtual-data-room-main/` and `vdr-qa-starter/`) and a **root `Makefile`**. It builds on v0.9; no application business logic has been changed.

**Tested here:** 49/49 offline QA framework tests pass, Make recipes inspected with `make -n`, shell/JS syntax validated. **Not tested here:** actual `docker pull`, NestJS+PostgreSQL load measurements, npm dependency download, Cypress/browser execution; these require your Ubuntu.

## First-time setup (Ubuntu, 2 terminals)

Requirements: Docker Engine with Compose v2 plugin and working Docker daemon; GNU Make, Bash and [nvm](https://github.com/nvm-sh/nvm) installed at `~/.nvm/nvm.sh`. The scripts **do not** install Docker Engine or nvm automatically. Do not run Docker commands with `sudo` if your account is not configured; see official Docker post-install docs. Review the security implications of membership in the `docker` group.

From the **extracted archive root** (where `Makefile` lives):

```bash
make help
make setup           # nvm install/use Node 22.16.0, npm deps, Cypress, FFmpeg, docker pull grafana/k6:latest
make env-qa env-k6 env-browser   # creates editable local env files; never overwrites existing ones
make postgres-up
make db-prepare      # guard checks local vdr_qa_test, Prisma generate + migrate deploy
make perf-seed       # once: 12 folders + 120 PDF metadata rows
```

`make setup` may take time and use network access. `api` and `web` use `npm ci` and existing upstream lockfiles; QA generates a local `package-lock.json` when missing. Cypress is installed at exactly `16.2.0` without modifying the upstream web lockfile. For future releases you can explicitly update versions/locks, but nothing is auto-upgraded by `make setup`. `grafana/k6:latest` is **not pinned**; override `K6_DOCKER_IMAGE` with an approved tagged image or digest to freeze a verified version.

**Terminal 1** (from extracted root):

```bash
make api-dev
```

Check API health if desired: `curl -fsS http://127.0.0.1:3100/health`.

**Terminal 2** (from extracted root):

```bash
make k6-version
make perf-smoke
make perf-load
```

Both commands use `docker run --rm --init --network host` under the hood. On native Linux/Ubuntu **localhost inside the container is the host** with `--network host`, so `K6_BASE_URL=http://127.0.0.1:3100` works unchanged. Do not set `host.docker.internal` or switch to `bridge` without changing the safety policy. Port `3100` is not published with `-p` and is not exposed to the public Internet by this setup.

### Local env and secrets

- `virtual-data-room-main/apps/api/test/.env.test`: DATABASE_URL and DIRECT_URL pointing **only** to `127.0.0.1:54329/vdr_qa_test` plus `QA_INTEGRATION_ACK`, dev JWT and harmless dummy Supabase placeholders. Created only by `make env-qa`. Never commit or upload.
- `.env.browser`: optional Make-side Chromium paths (existing Chrome binary), plus opt-in sandbox workaround for trusted environments.
- `.env.k6`: Make-side configuration of k6 executor/image/base URL/acknowledgments. Created only by `make env-k6`. Default is **Docker**; no native k6 CLI required. This file contains no DB credentials by default.
- The runner validates localhost, local test DB, bounded VUs and fixture ownership before starting Docker. It reads the seeded one-use QA account from `test/qa-perf/.qa-perf-state.json`, creates a temporary **0600** Docker `--env-file` containing only k6-required values (not DATABASE_URL or Supabase secrets), and deletes it after the run. Docker inspection and local host admins can still see container env while running; use disposable credentials only.
- The output `reports/performance/*.json` is written to host via a separate bind mount. The k6 test scripts are mounted read-only. No public demo load, no Supabase load, no destructive VDR API calls.

### More test commands (`make help` for all)

| Make target | Action |
|---|---|
| `make node-install` | Install Node 22.16.0 in nvm without changing global default |
| `make node-version` | Confirm Node/npm selected for Make |
| `make deps` | Reinstall API/Web/QA npm dependencies + Cypress 16.2.0 |
| `make k6-install` | Download and validate `grafana/k6:latest` Docker image |
| `make test-integration` | Jest + NestJS + isolated PostgreSQL |
| `make test-pdf` | PDF lifecycle + byte-aware fake Storage |
| `make test-cypress` | React Component Testing via Chrome |
| `make test-api` / `make test-ui` | Read-only Playwright against configured environment |
| `make test-framework` | Self-tests of QA instrumentation |
| `make test-all-safe` | Safe default tests; does not run known-defect or mutation suites |
| `make test-known` | **Expected red**: two currently confirmed application defects |
| `make perf-smoke` / `make perf-load` | Local read-only k6 Docker profiles |
| `make perf-<stress/spike/soak/volume/scalability>` | Bounded heavy profiles, separate opt-in |
| `make perf-cleanup` | Remove only seeded performance test resources |
| `make lighthouse-auth` / `make lighthouse-public` | Lighthouse CI (uses your CHROME_PATH) |

The local PostgreSQL guard runs before destructive DB operations. **Do not run `test:qa:storage` or other mutation tests against the public demo.**

### Heavy profiles and volume

Before running any heavy k6 profile, explicitly acknowledge the isolated host workload:

```bash
K6_HEAVY_ACK=I_ACCEPT_QA_LOAD make perf-stress
K6_HEAVY_ACK=I_ACCEPT_QA_LOAD make perf-spike
K6_HEAVY_ACK=I_ACCEPT_QA_LOAD make perf-soak
```

For volume tests, first stop ongoing runs, then `make perf-cleanup` and `make perf-seed-medium` (300 folders/3000 metadata records). Restart API if needed, then:

```bash
K6_HEAVY_ACK=I_ACCEPT_QA_LOAD make perf-volume
```

For 100,000 metadata records, the separate opt-in is `QA_PERF_LARGE_ACK=I_ACCEPT_100K_METADATA_ROWS make perf-seed-xlarge` (only after cleanup). It does **not** create real PDFs. For scalability, actually change allocated backend resources and set `K6_SCALE_LABEL=one-cpu` etc. A label alone is not a scalability test.

### Reports

```bash
ls -lt vdr-qa-starter/reports/performance/
make perf-analyze REPORT=reports/performance/<actual-file>.json
```

`REPORT` is relative to `vdr-qa-starter`. The runner prints the exact JSON filename after each run. Failed thresholds result in nonzero exit; do not record them as PASS.

### Notes on versions

- Node: `.nvmrc` = **22.16.0**, used by every Make npm/node command via `scripts/with-node22.sh`.
- API and Web: existing `package-lock.json`, installed via `npm ci`.
- QA: `npm install` only when no lock exists; later `npm ci`.
- Cypress: explicit **16.2.0**; original web lockfile is not rewritten.
- k6: Docker image `grafana/k6:latest`, or override with pinned version/digest in `.env.k6` after validation.
- Chromium: reused from your extracted archive; set `CHROME_PATH` for Lighthouse and `CHROMIUM_EXECUTABLE_PATH` for Playwright.
- FFmpeg: installed by `make setup` through the locked Playwright version; separately available as `make playwright-ffmpeg`.

If you unzip over an existing working directory, take care **not to overwrite your `.env`, `.env.test`, `.env.k6`, generated fixture or reports**. Recommended: extract to a fresh directory and copy only required local configuration.
