# QA Performance — v0.9

k6 lives in sibling `vdr-qa-starter/performance/k6/`.
Fixture seed code lives in `apps/api/test/qa-perf/seed.cjs`. The test must be explicitly acknowledged and uses only local `vdr_qa_test` PostgreSQL. It creates a new, synthetic test user/room and PDF **metadata**, never uploads bytes to Supabase.

See `../../vdr-qa-starter/docs/performance-v0.9.md` (when both project folders are siblings) for full step-by-step commands. The root `RUNME-v0.9.md` is the portable entrypoint.
