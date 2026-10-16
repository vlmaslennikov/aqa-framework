# Exploratory Product QA — execution record and next charters

The goal is honest exploratory evidence, **not** converting a checklist to PASS without a human actually performing each action.

## Previously reported limited live session (not rerun in v0.17)

Source: user's pasted excerpt from the previous conversation, 2026-10-16. Reported observations from public demo (the original screenshot/trace and exact timestamp were not carried into this archive):

- Submitting an empty login form showed required-field validation.
- Error messages were associated with the affected login fields.
- Navigating directly to a protected private route while anonymous redirected to login.

All three observations are **HISTORICALLY REPORTED**, not independently verified in this v0.17 execution. Reproduce and capture screenshot/trace before attributing them to a current deployment. No private test data was deleted.

## Charters (each NOT EXECUTED here)

| ID | Priority | Mission | Expected evidence |
|---|---|---|---|
| EX-01 | P0 | Viewer inside shared folder while Owner deletes that folder | Permission change timing, error/redirect UI, no information leak, screenshots and timestamps |
| EX-02 | P0 | Preissued signed PDF URL immediately after revoke, then after TTL | API new URL rejected; old URL status before and after TTL; redact all signatures |
| EX-03 | P1 | Drop 3 PDF files: 1 valid, 1 duplicate name, 1 intentional Storage failure | Per-file progress, recovery, deduplication, cleanup and final downloaded hashes |
| EX-04 | P1 | Disconnect during upload PUT and during `/complete` | Pending records, retry UX, no phantom completed file |
| EX-05 | P1 | Move file into folder with same filename while Viewer browses original | Original remains readable to right users; access and names update consistently |
| EX-06 | P2 | Mobile 375px and tablet 768px layouts; keyboard-only operations | Focus order, modal trap, overflow and action discoverability |
| EX-07 | P2 | Expired public link and invalid public token | Clear error, never leaked room/file metadata |
| EX-08 | P2 | 100,000 metadata listing with selected pagination boundaries | Time/contract on disposable DB, no duplicates/missing rows, no load on public demo |

## Session evidence template (complete after execution)

```
Charter ID / run ID:
Tester and date (UTC):
SUT URL, source/build SHA and browser:
Role and disposable test resource (no secrets):
Starting state and data:
Actions taken (numbered):
Observed outcome / screenshots / trace path:
Requirement / expected outcome:
Status: PASS | ISSUE FOUND | BLOCKED | NOT RUN
Bug ID or follow-up decision:
Cleanup confirmed:
```

Treat missing functionality carefully: search and versioning are optional. A missing test is not a missing product requirement.
