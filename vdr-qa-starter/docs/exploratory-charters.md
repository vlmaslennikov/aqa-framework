# Short exploratory charters

1. **Confidentiality (P0/P1):** use isolated Owner and Viewer; cross-account direct URL/API guessing, scoped ancestor breadcrumbs, mutations via API bypass UI, revoke and cached views. Evidence: sanitized status matrix.
2. **PDF lifecycle (P1):** valid PDF <= 50 MiB, zero-byte/truncated payload, misleading MIME/extension, interrupted PUT, concurrent upload intent; confirm only completed files are visible and accessible, and cleanup after failure.
3. **Public sharing (P1):** root-only vs folder-only link, nested contents, anonymous and signed-in use, invalid/revoked/expired token, link reuse and pre-issued storage URL after revoke.
4. **Data consistency (P1/P2):** rename conflict, move file conflict, delete parent with children, same-name requests bounded concurrency, stale navigation cache after mutation, paging boundary and cursor behavior.
5. **UX (P2):** loading states, progress and retries, paste unusual unicode names, keyboard flows, empty states, smaller viewport, recover after refresh, PDF preview/download user feedback.

Time-box each charter (~15-25 min); save hypothesis, fixture, environment, observed result, and follow-up. Avoid destructive checks on shared demo.
