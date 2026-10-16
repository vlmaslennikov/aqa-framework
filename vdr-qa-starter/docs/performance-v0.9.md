> **Update v0.10:** k6 runs in Docker by default. Prefer the root `RUNME-v0.10.md` and `make setup`, `make perf-smoke`, `make perf-load`. The native k6 CLI commands below are retained only as historical v0.9 instructions (opt-in with `K6_EXECUTION=native`).

# VDR v0.9 — local k6 performance testing

**Scope:** isolated NestJS + PostgreSQL metadata endpoints. No public demo load and no Supabase access. See `../performance/k6/README.md`.

## Prerequisites

- Ubuntu/Linux with Docker Engine + k6 Docker image (or optional native k6), Node 22+, npm dependencies for `apps/api`, local PostgreSQL launched with `qa/docker-compose.postgres.yml`.
- **Do not use the public Vercel/Railway deployment, or a local API connected to production/staging DB.** Every shell running seeding, backend or k6 must source the same guarded `apps/api/test/.env.test`; check `DATABASE_URL`, `DIRECT_URL`, `QA_INTEGRATION_ACK`.
- k6 runner checks the locally named PostgreSQL URLs and the specific seeded QA room through an actual login request. This is a defense in depth check, not proof of production isolation if your network is intentionally misconfigured.

## Terminal A — prepare data and run NestJS API

```bash
cd virtual-data-room-main
# Already created in v0.7; safe to run again:
docker compose -f qa/docker-compose.postgres.yml up -d
cd apps/api
npm ci
cp -n test/qa-env.example test/.env.test
# Inspect test/.env.test manually and set your local test secrets.
set -a; source test/.env.test; set +a
node test/qa-db-guard.cjs
npx prisma generate
npx prisma migrate deploy
npm run qa:perf:seed       # small: 12 folders + 120 PDF metadata records
PORT=3100 npm run start:dev
```

**Do not use** `npm run qa:perf:seed` if fixture already exists: `seed.cjs` refuses overwrite. There is no need for a running Supabase service; read-only measured paths do not reach Storage.

## Terminal B — run k6

```bash
cd vdr-qa-starter
# Adjust relative path if your folders are not siblings:
set -a; source ../virtual-data-room-main/apps/api/test/.env.test; set +a
export K6_BASE_URL=http://127.0.0.1:3100
export K6_LOCAL_QA_ACK=I_OWN_THIS_DISPOSABLE_QA_STACK
k6 version
npm run qa:perf:smoke
npm run qa:perf:load
```

The runner reads a locally generated state file at `../virtual-data-room-main/apps/api/test/qa-perf/.qa-perf-state.json` and passes a temporary seed account to k6 without printing the password. File mode is `0600`. **Never upload or commit this JSON**. `reports/performance/*.json` are k6 summaries and should still be reviewed before sharing.

## Profiles

| npm command | Configuration | Note |
|---|---|---|
| `qa:perf:smoke` | 1 VU / 10s | checks wiring |
| `qa:perf:load` | 5→10→0 VUs / 60s | baseline, query latency and RPS |
| `qa:perf:stress` | up to 30 VUs / 90s | capped stress **pilot**, not system capacity |
| `qa:perf:spike` | 3→30→3→0 VUs / 35s | burst and recovery pilot |
| `qa:perf:soak` | 5 VUs / 10 minutes | short-duration soak pilot, not proof against long-term leaks |
| `qa:perf:volume` | 8 VUs / 60s | **requires** medium+ dataset (>=3000 records) |
| `qa:perf:scalability` | 10 VUs / 60s | repeat under each manually configured topology; `K6_SCALE_LABEL` required |

Every heavy profile (`stress`, `spike`, `soak`, `volume`, `scalability`) also requires:

```bash
export K6_HEAVY_ACK=I_ACCEPT_QA_LOAD
```

For larger volume, first clean up the *existing QA fixture only* and reseed:

```bash
cd ../virtual-data-room-main/apps/api
set -a; source test/.env.test; set +a
npm run qa:perf:cleanup
npm run qa:perf:seed:medium  # 300 folders, 3000 metadata rows
# npm run qa:perf:seed:large # 1000 folders, 10000 metadata rows
# QA_PERF_LARGE_ACK=I_ACCEPT_100K_METADATA_ROWS npm run qa:perf:seed:xlarge # 10k folders, 100k rows
```

**Warning:** When you reseed, the local backend might remain running with cached connections; seed and cleanup only when tests are stopped. Benchmarking uses metadata, not actual physical PDFs.

For scalability, configure backend allocations yourself, document CPU/RAM/replicas, run identical load each time and set distinct labels:

```bash
export K6_SCALE_LABEL=one-cpu
npm run qa:perf:scalability
# reconfigure local backend (example: two-cpu), verify resource allocation
export K6_SCALE_LABEL=two-cpu
npm run qa:perf:scalability
```

We do not claim any scaling measurements unless those real infrastructure differences have been applied and recorded.

## Results and analysis

After a run, the runner prints the JSON path:

```bash
node scripts/k6-analyze.mjs reports/performance/<profile>-<timestamp>.json
```

Record: profile, test data size, server hardware, machine load, run timestamp, `http_reqs` (count and RPS), `http_req_duration` p50/p95/p99, `http_req_failed`, `qa_contract_errors`, checks, failed thresholds. `p95<1200ms` and error rate `<2%` are **provisional QA budgets**, not stakeholder SLAs. k6 thresholds fail with non-zero exit code. A status-200 response returning the wrong JSON structure fails contract checks.

Important: k6's `http_req_duration` covers all requests including one-time login/preflight. Main traffic is mixed and per-endpoint latency must be inspected separately before filing bottleneck bugs. Do not mistake a successful 10-second smoke for load capacity. Record CPU and Prisma/PostgreSQL metrics separately: RPS by itself doesn't establish the bottleneck.

## Safety and hygiene

- Explicit local-only guard rejects remote URLs, embedded credentials, paths and redirects.
- DB guard prevents accidental use of production DBs for fixture creation/cleanup and checks `vdr_qa_test` database on 127.0.0.1.
- Only your generated performance user/room are deleted by `qa:perf:cleanup`; existing QA data are untouched.
- All load profiles are bounded (maximum 30 VUs), heavy profiles require a second acknowledgement.
- `qa:perf:seed:xlarge` creates **100,000 database metadata rows**, not PDF files; it has a third acknowledgement. Ensure sufficient disk and resources.
- Do not start multiple k6 processes against the same local target without controlling combined VUs.
- Stop and investigate sustained errors or OOM; avoid treating severe error storms as expected.

## QA assessment after run

Combine endpoint latency + transport/contract error rates with PostgreSQL query plans (`EXPLAIN ANALYZE`) and CPU/RAM. If a performance regression is found, provide a reproducible profile, dataset size, host specs and two comparable runs. Release readiness remains a separate decision and also requires authorization/security and storage E2E coverage.
