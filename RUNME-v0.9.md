> Superseded for Docker k6 by `RUNME-v0.10.md`.

# Virtual Data Room QA — v0.9 (Grafana k6)

Contains v0.8's **unmodified product logic**, Jest integration & PDF lifecycle tests, Cypress component tests, Playwright API/E2E, Lighthouse CI, ScanRepo, plus a guarded local-only k6 performance suite.

## Confirmed from prior local runs (reported by user)

- Jest core integration 7/7 PASS; PDF lifecycle integration 4/4 PASS.
- Cypress Component Testing 8/8 PASS.
- Playwright API 9/9 PASS, browser UI 5/5 PASS.
- Lighthouse 6 auth audits completed. Two known backend defects reproduced by dedicated red tests.

## New work in v0.9

- `vdr-qa-starter/performance/k6/{policy.js,readonly.js}` — bounded API profiles (smoke, load, stress, spike, soak, volume, scalability), origin/profile safety guards and JSON contract checks.
- `virtual-data-room-main/apps/api/test/qa-perf/seed.cjs` — explicit isolated PostgreSQL dataset generator + cleanup; small/medium/large/xlarge.
- `vdr-qa-starter/scripts/k6-run.mjs` — refuses remote URLs, verifies QA DB and generated fixture, runs k6 CLI, saves JSON evidence.
- `vdr-qa-starter/scripts/k6-analyze.mjs` — converts k6 JSON into a concise verdict and latency metrics.
- `vdr-qa-starter/docs/performance-v0.9.md` — full Ubuntu commands, precautions and result interpretation.
- Guard/unit tests for all safety components.

## Fast start on Ubuntu

1. Read `vdr-qa-starter/docs/performance-v0.9.md` before running.
2. Terminal 1: start dedicated `qa/docker-compose.postgres.yml`, source `apps/api/test/.env.test`, run `node test/qa-db-guard.cjs`, `npx prisma migrate deploy`, `npm run qa:perf:seed` and `PORT=3100 npm run start:dev` from `apps/api`.
3. Terminal 2: from `vdr-qa-starter`, source the **same** `apps/api/test/.env.test`, set `K6_BASE_URL=http://127.0.0.1:3100`, `K6_LOCAL_QA_ACK=I_OWN_THIS_DISPOSABLE_QA_STACK`, and run `npm run qa:perf:smoke` then `npm run qa:perf:load`.
4. `k6` CLI is needed (`k6 version`). This package does not bundle k6 or Docker images.
5. Analyze the exported JSON: `node scripts/k6-analyze.mjs reports/performance/<file>.json`.
6. Only after testing, run `npm run qa:perf:cleanup` from `apps/api` with `.env.test` sourced.

**Cannot claim a real k6 benchmark** until run against your local NestJS + PostgreSQL on Ubuntu. This archive contains runnable scripts and independently tested safety/configuration logic, not fabricated performance measurements.
