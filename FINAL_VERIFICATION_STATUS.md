# Final QA verification status — prepared, not executed here

- Current environment cannot resolve the publicly deployed VDR domain (`curl`: DNS failure).
- Current environment has no locally running NestJS/PostgreSQL or isolated Supabase service-role key.
- Last user-provided evidence: Playwright API 6/9 + 3 skipped; Playwright UI 7/7; Jest+Postgres 21/21; original NestJS 42/42; Cypress 8/8.
- Newly added: four read-only exploratory Playwright tests with evidence screenshots and a signed-URL revoke experiment inside the guarded real Supabase lifecycle E2E.
- Do not label these new runtime checks PASS until executed on authorized infrastructure.
- Local infrastructure checks are distinct from product checks.

Run from project root `make qa-final-readonly`, then prepare dedicated Supabase and run `make qa-final-storage`. See SUBMISSION/07_FINAL_VERIFICATION_RUNBOOK.md.

- QA framework tests executed on patched code: 90/90 PASS; see evidence/verification/framework-90of90-final.log.
