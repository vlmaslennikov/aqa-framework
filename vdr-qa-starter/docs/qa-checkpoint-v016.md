# VDR Product QA — execution checkpoint v0.16

## Purpose and product context

A private, read-only-shared Virtual Data Room for due diligence. The risk-based order is access control / data leakage, revocation, document integrity, destructive operations, then UX/polish and performance. This is a Product QA take-home: the evaluation is based on choices and evidence, not maximal framework complexity.

## What has actually been executed (user-provided console output / prior chat)

| Set | Observed outcome | Evidence precision |
|---|---|---|
| Playwright API read-only | 9/9 PASS | User terminal logs; raw JSON/test trace not bundled |
| Playwright Chromium (before latest added test) | 5/5 PASS | User terminal logs on prior configuration; v0.16 rerun required |
| Cypress React components | 8/8 PASS | User terminal logs in Chrome 146 |
| NestJS+Prisma core integration | 7/7 PASS | User terminal log with local DB guard |
| NestJS+Prisma PDF lifecycle | 4/4 PASS | User terminal log with local DB guard and mocked Storage |
| Expected-red regressions | 2 failing as expected | Registration returned 201 vs expected 400; Storage metadata >50MiB completion returned 201 vs 400 |
| Lighthouse CI | 6 authenticated navigation audits completed | User-supplied Lighthouse summary; scores are not security or WCAG evidence |
| QA Framework unit/guards in THIS artifact | 66/66 PASS | `evidence/unit-v016.log` created in this workspace |
| New requirement + sharing suites | NOT RUN | Need Node packages / local PostgreSQL on Ubuntu |
| Added UI negative-login assertions | NOT RUN | Need user's Chromium/browser execution |
| Real Supabase mutation E2E | NOT RUN | Needs disposable private Supabase project and explicit opt-in |
| Docker k6 | Previous separate-chat baseline reported | Preserve actual raw k6 JSON, target fixture, host and timestamps before quoting metrics |

Previously confirmed regression gaps: **QA-AUTH-06 (P2)** whitespace-only name, and **QA-FILE-02 (conditional P1)** post-upload actual Storage size validation. Do not equate fake Storage reproduction with bypassing the real Supabase service.

Additional *risks*, NOT confirmed product defects: signed URLs issued before revoke may remain usable, folder-name concurrent race (one prior trial returned 201/409), abandoned upload intents, non-revocable individual 7-day JWT sessions, orphan objects on Storage delete failure (documented policy).

## Implementation added in v0.16

1. Four black-box NestJS+Prisma scenarios: folder case-insensitive conflict; upload/move name resolution; 2-item pagination across folder-file boundary; delete-preview exact nested size/count + subtree deletion.
2. Six black-box sharing scenarios: `DATAROOM`, `FOLDER`, `FILE` each with `USER` and `PUBLIC_LINK`, including unrelated resource isolation, disallowed write, revocation.
3. Read-only Playwright UX regression: blank login shows errors and does not call `/auth/login`; negative password tests HTTP 401 and a visible error message.
4. Make/CI entries for the two suites and requirement-to-test coverage documentation.

No VDR production/business code modified. This is a verification extension, not a patch for either confirmed defect.

## What's still missing for a strong take-home submission

- **Actual execution evidence** for these ten new scenarios and the new UI assertion; capture sanitized logs, Git SHA, Node/browser version, environment, date and traces on failure.
- **Real Storage E2E** for full PDF bytes and browser upload, multi-file drag/drop/progress, revoked pre-issued URLs (policy decision), failed upload retry and CORS.
- **Focused exploratory QA** on delete dialog text, folder removal while viewer is inside it, mobile responsive states, accessibility keyboard, network faults.
- **Bug reports** with reproduction steps, expected/actual, severity, impact, screenshots/traces and disposition; keep hypotheses separate.
- **Final report** with covered/not-covered list, test data cleanup, environment, risk matrix, AI-use disclosure and bounded release recommendation.

## Release decision

**Insufficient evidence for unqualified production GO.** The QA take-home can still be submitted with transparent gaps and reproducible tests. For a confidentiality-sensitive production VDR, the conditional Storage size bypass and signed URL revocation semantics need explicit review before approval.

## Commands on user's Ubuntu

From the root after applying this update and with prior local `.env.test` intact:

```bash
make test-framework
make test-requirements
make test-sharing
make test-integration
make test-pdf
make test-ui
```

`make test-requirements` and `make test-sharing` require the *local* `vdr_qa_test` database and disposable setup. No test writes to public demo. `make test-known` is separately expected-red, not part of the green suite.
