# VDR QA v0.21 — independent product evidence, no new external services

This version extends v0.20 with independently executed source-boundary probes and two separate follow-up test entry points. Existing `make setup`, `.env` synchronization, test pyramid and production-safety checks remain unchanged.

Run from project root after your existing `make setup`:

```bash
make qa-investigate          # no DB/browser/storage; runs real source logic with stubs
make qa-report               # integrates source-boundary evidence; does NOT count it as product PASS
make qa-investigate-api      # actual Nest FilesService in Jest, no DB (new behavior reproduction)
make qa-investigate-ui       # actual DeleteFolderDialog in Cypress, 503 intercepted, no public mutations
```

`make qa-investigate` creates `evidence/independent/boundary-probes.json` with unmodified code file hashes and precise observed boundary behavior. Running investigation tests is optional and separate from `make qa-evidence-local` / `test-all-safe` because a passing *finding reproduction* is NOT a satisfied requirement.

Then review `vdr-qa-starter/docs/PRIMARY-FINDINGS-v021.md` and execute the manual sessions in `vdr-qa-starter/docs/EXPLORATORY-PRIMARY-v021.md` on an approved disposable environment. Capture primary logs/screenshots and only then promote a candidate to a deployed-app confirmed defect.

No live network/product browser or PostgreSQL tests were performed by the v0.21 authoring environment. Existing historical user runs are retained; their results are not silently re-labelled as new.
