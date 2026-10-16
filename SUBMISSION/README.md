# Virtual Data Room — Product QA Practical Assignment

**Submission date:** 16 October 2026  
**Product:** [evo9/virtual-data-room](https://github.com/evo9/virtual-data-room)  
**Original requirements:** [`../virtual-data-room-main/task.md`](../virtual-data-room-main/task.md)  
**Approach:** risk-based, requirement-driven Product QA with exploratory analysis and reusable test automation.

**Framework architecture and design rationale:** [Main README](../README.md) · [QA implementation guide](../vdr-qa-starter/README.md).

## Deliverables — start here

| Required deliverable | Location |
|---|---|
| Short test plan | [01_TEST_PLAN.md](01_TEST_PLAN.md) |
| Prioritized bug / findings report | [02_PRIORITIZED_FINDINGS.md](02_PRIORITIZED_FINDINGS.md) |
| Automated tests | `../virtual-data-room-main/apps/api/test/`, `../virtual-data-room-main/apps/web/cypress/`, `../vdr-qa-starter/tests/` |
| Testing approach / reusable pyramid | [03_TESTING_APPROACH.md](03_TESTING_APPROACH.md) |
| Final QA report | [04_FINAL_QA_REPORT.md](04_FINAL_QA_REPORT.md) |
| AI usage | [05_AI_DISCLOSURE.md](05_AI_DISCLOSURE.md) |
| Evidence/provenance | [06_EVIDENCE_AND_LIMITATIONS.md](06_EVIDENCE_AND_LIMITATIONS.md) |

**Product assessment at submission:** **CONDITIONAL NO-GO for unrestricted confidential production use; demo/MVP assessment is PARTIAL.** This is an evidence-based *readiness recommendation*, not an assertion that the publicly hosted demo is unusable. The principal blockers are unverified real-storage/revocation edge cases and conditional server-side upload size enforcement. See the final report.

## Quick run — Ubuntu / GNU Make / Docker

Use the repository root `Makefile`. `make setup` installs Node 22.16.0 with nvm, API/frontend/QA dependencies, Playwright Chromium+FFmpeg, Cypress and the k6 Docker image; QA env files are generated from the root `.env`. Copy `.env.example` to `.env` and fill in credentials before setup. **Do not commit `.env`.**

```bash
cp .env.example .env  # fill credentials from the product README; public tests are read-only
make setup
make postgres-up
make db-prepare
make qa-evidence-local
make qa-evidence-browser
make qa-report
```

`qa-evidence-*` outputs are written to `reports/qa-runs/<timestamp>/`; the aggregate report is `reports/product-qa/latest.md`. A nonzero exit can mean tests failed, were blocked by missing resources, or were only partially executed; read `summary.json` rather than assuming a green/passed suite. Known defects are demonstrated separately by `make test-known-unit` (asserts *current defective behavior*) or `make test-known` (expectation-based tests intended to be red until fixed).

For source-boundary investigation, use `make qa-investigate`. Optional local Jest and Cypress finding reproductions are `make qa-investigate-api` and `make qa-investigate-ui`. These checks are **not normal acceptance tests**.

**Safety:** the publicly hosted app is used only for non-destructive read-only tests. Mutating API tests use localhost `vdr_qa_test`; real Supabase E2E requires explicit authorization and a disposable bucket. Do not run load/destructive suites against the shared public demo.

## Scope note

The original VDR repository code is in `virtual-data-room-main/` and is **not claimed as QA-authored**. Existing backend Jest unit tests are also upstream. Newly authored QA additions comprise local NestJS/PostgreSQL integration suites, boundary probes, Cypress component tests, Playwright API/UI checks, storage E2E scaffolding, guards, fixtures and reporting. Search and versioning are *optional* original requirements and not reported as defects.

## Extra final verification (not counted as executed)

See [07_FINAL_VERIFICATION_RUNBOOK.md](07_FINAL_VERIFICATION_RUNBOOK.md) for full API, read-only exploratory screenshots and gated local Supabase E2E with signed-URL revocation observation. These tests are **not** claimed as passed until runtime logs are provided.
