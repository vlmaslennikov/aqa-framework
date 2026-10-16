# Real PDF storage E2E — isolated only

Configure an isolated local Postgres QA database and a disposable Supabase project/bucket. After registering a fresh local account, run from the distribution root:

```bash
make env-storage
# Fill only OWNER_EMAIL and OWNER_PASSWORD in vdr-qa-starter/.env.storage.
make test-storage
```

The local account's single owned room is selected automatically. The test refuses to guess if the account owns multiple rooms. No UUID needs to be copied. The guarded `make test-storage` loads `.env.storage` without modifying the public read-only `.env`.

This performs a real browser upload to a local VDR API configured against a **disposable** Supabase project, followed by download/SHA-256/rename/move/delete. It may leave pending metadata if the browser upload fails. It is excluded from `npm run test:ui` by the existing `@mutation` filter. **Never set both mutation opt-in flags for the shared demo.**
