# Testing approach: risk-based, reproducible, minimal automation pyramid

**Top failure mode:** unauthorized disclosure or modification of due-diligence documents. Order investigation by business impact and likelihood, not test count. Start with access isolation, share inheritance and revoke, then uploads/validation and data integrity, and only then UI polish.

The starter has three distinct layers: (a) product's own Jest unit tests in `apps/api` (42 reportedly passed previously; not copied here), (b) independent Playwright `APIRequestContext` tests that verify HTTP authorization/validation and sharing, and (c) minimal Chromium E2E journeys. Node unit tests in this artifact protect the test-harness safety gate. A test framework should remain deterministic and usable without an AI agent.

All mutation tests have two explicit flags and an allowlisted target rule; public Railway/Vercel demo domains are hard-denied. Default `npm test` excludes `@mutation`. Some negative POST tests can accidentally mutate if the product validation is broken, therefore they too are tagged `@mutation`. New account registrations cannot be cleaned up by a public account-deletion API: run only against disposable DB/storage or accept cleanup explicitly.

**Evidence:** record timestamps, branch SHA, target, API/browser versions, counts, request/response evidence with confidential fields redacted; isolate source inspection from observed runtime. Only mark a defect 'confirmed' when reproductions are captured. In CI traces and results are sensitive because they can include access tokens; keep artifacts private and limit retention.

**ScanRepo:** optional remote-repo static scan for malicious/suspicious supply-chain patterns, with `--no-publish` and on-demand CI. It is separate from product behavior and does not audit local files. Its results require manual triage.

**AI declaration:** AI is used for requirement mapping, hypothesis generation, TypeScript tests and evidence summarization. It does not determine PASS/FAIL by narrative, and LLM/MCP tools are optional assistance rather than part of CI assertions.
