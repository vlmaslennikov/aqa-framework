# Authenticated Lighthouse — observed browser measurements

Source: user-provided `qa-summary(1).json`, copied verbatim into `evidence/lighthouse-auth-user-run-2026-10-16.json`.

Six collected and route-verified Navigation audits: three runs each on `/` and `/shared-with-me`.

| Page | Runs | Performance median | Accessibility median | Best practices median | LCP median | CLS median |
|---|---:|---:|---:|---:|---:|---:|
| Dashboard (`/`) | 3 | 97/100 | 100/100 | 100/100 | 2.007s | 0 |
| Shared With Me | 3 | 99/100 | 100/100 | 100/100 | 1.923s | 0 |

Interpretation: No actionable performance or accessibility **failure demonstrated in these lab navigation audits**. Accessibility 100 does not prove WCAG compliance; CLS 0 is limited to measured load. The results do not cover file viewing, content-heavy rooms, UI interaction, access control, or production user data. No product bug is filed based on these observations. Full LHR diagnostics were not supplied.

Environment: public deployed site with an authorized demo account; user runs on Ubuntu using their own Chrome build. Chrome sandbox was disabled by explicit opt-in for troubleshooting. These Lighthouse audits must not be treated as load tests.

Next: include `/room/:id`, `/folder/:id`, `/file/:id` with explicit test-object UUIDs. Never include signed share tokens in Lighthouse report URLs.
