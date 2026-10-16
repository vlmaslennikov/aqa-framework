# Evidence provenance and explicit limitations

## User-provided first-hand console results, 16 October 2026

The following were supplied in the conversation as direct output from Ubuntu. These are **historical execution observations**, not fresh execution on the packaged v0.21 source:

| Source/run | Result | Meaning |
|---|---|---|
| `make qa-evidence-local` against v0.18 | Product Jest unit **42/42 PASS** | Original VDR developer tests. |
| same | QA core integration **7/7 PASS** | Real NestJS/PostgreSQL, external Storage stubbed. |
| same | PDF lifecycle **4/4 PASS** | Hash matched with fake HTTP byte Storage. |
| same | Requirements **4/4 PASS** | Naming, pagination and deletion integration. |
| same | Sharing matrix **6/6 PASS** | Scoped USER/PUBLIC_LINK combinations, local isolated DB. |
| same | Cypress **8/8 PASS** | React component behavior under simulated responses. |
| same | Known boundaries **2/2 FINDINGS_REPRODUCED** | Tests intentionally assert existing failures; not product acceptance passes. |
| `make qa-evidence-browser` v0.18 | Playwright API **6/9 executed, 3 skipped (PARTIAL)** | No all-green API claim for this version. |
| same | Playwright UI **7/7 PASS** | Public read-only smoke with authorized test account. |
| v0.18 wrapper initially | `qa-framework` and `qa-guards` incorrectly shown as FAIL by TAP parser | The runner was patched later (v0.19); separate framework executions succeeded. Tooling status is not VDR status. |
| v0.21 isolated investigation | Three reproduced *boundary* behaviors, incl. 2 new hypotheses | Fake dependencies, not deployed browser/Supabase confirmation. |

**What is not provided:** a single same-commit full-run `summary.json` with all runtime suites, deployed build SHA, recorded manual exploratory screenshots for all charters, real Supabase mutation E2E completion, performance distribution under realistic 100k files. The original user console lines above are from the conversation, not independently signed machine evidence.

**Finding evidence terms:** `REPRODUCED_LOCAL_HTTP` = isolated local API contract; `REPRODUCED_BOUNDARY` = actual product method/React component with dependency stubs; `HYPOTHESIS` = reasoned risk requiring experiment; `NOT_RUN` = test authored but not executed; `PARTIAL` = some tests skipped; `PASS` = all tests in named execution passed.

**Data safety:** demo credentials are test accounts specified in upstream README, but do not publish passwords in reports. Keep `.env`, Storage keys and signed URL query strings outside the submission. Only use local approved test resources for destructive checks.

## Post-submission readiness addendum — 16 October 2026

The four new browser exploratory charters and the real signed-URL revoke observation were **authored but NOT RUN** in this environment (public demo DNS and isolated Supabase unavailable). A dry-run of the relevant Make targets and TypeScript transpilation passed. The QA framework Node unit/guard tests were run on this patched package: **90/90 PASS** (infrastructure, not product). See `07_FINAL_VERIFICATION_RUNBOOK.md`. The full Playwright API 9/9 and real Supabase E2E still require first-hand user execution logs; do not include them as historical product PASS until confirmed.
