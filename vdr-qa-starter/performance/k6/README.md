> v0.10 Docker runner: use `make k6-install` and `make perf-smoke` from the archive root. See `RUNME-v0.10.md`. No local k6 binary required.

# k6 performance benchmarks — ISOLATED LOCAL STACK ONLY

Use `../../scripts/k6-run.mjs` (via npm commands), not raw k6, so the PostgreSQL ownership guard and seeded account are verified before running.

All profiles refuse public VDR/Vercel/Railway endpoints. Targets must be `http://127.0.0.1:PORT` (or `localhost`/`[::1]`). Redirect following is disabled. Tests authenticate once (`POST /auth/login` in `setup()`) and then send **GET-only** measured traffic to health, room list, room contents, folder contents, breadcrumbs and PDF **metadata**.

No Supabase bytes are uploaded or downloaded by this suite. The generated `File` rows have dummy storage keys and MUST NOT be used for `view-url` or `download-url` tests. They exercise NestJS + Prisma + PostgreSQL metadata query performance, not signed URL performance, CDN, network bandwidth, file transfer, browser rendering or capacity planning.

See `../../docs/performance-v0.9.md` for environment setup, data sizes, CLI commands, metrics, thresholds, safety and interpretation.
