# Product QA — performance evidence (v0.9)

Status: **IMPLEMENTED, BENCHMARK NOT YET RUN**.

| Profile | Dataset | CPU/RAM/replicas | p50 | p95 | p99 | RPS | Transport errors | Contract errors | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| smoke | small | local, TBD | — | — | — | — | — | — | NOT RUN |
| load | small | local, TBD | — | — | — | — | — | — | NOT RUN |
| volume | medium/large | local, TBD | — | — | — | — | — | — | NOT RUN |
| stress | dedicated local only | TBD | — | — | — | — | — | — | NOT RUN |
| spike | dedicated local only | TBD | — | — | — | — | — | — | NOT RUN |
| soak | dedicated local only | TBD | — | — | — | — | — | — | NOT RUN |
| scalability | manually compared topologies | TBD | — | — | — | — | — | — | NOT RUN |

Budgets p95<1200ms and failed request/contract error rate<2% are **provisional only**, not product requirements. Expected 4xx cases are not part of this load suite. A passing threshold is not proof of capacity or readiness for a production release.

Capture for a meaningful conclusion: API startup profile, DB dataset & EXPLAIN details, local resource usage, server & database CPU/IO/RAM, test runner machine specs, actual k6 JSON summary, repeated equivalent runs, and any timeout/error signatures. User-provided Lighthouse and previous Playwright/Jest/Cypress results remain separate evidence.
