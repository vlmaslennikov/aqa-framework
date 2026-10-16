---
description: Closing checklist for a task - review changed files, verify builds and DoD, record the ai-notes entry
---

You have just finished implementing a task (or a meaningful chunk of one). Before reporting it as done:

## Step 1: Identify scope

```bash
git diff --name-only
git ls-files --others --exclude-standard
```

The task being closed: `$ARGUMENTS` (a task file like `04-folders.md`, or empty - then infer from the changed files).

## Step 2: Review

Invoke the `reviewer` subagent (it uses the `data-room-reviewer` skill), scoped to the changed files.

## Step 3: Act on findings

- **CRITICAL** - fix immediately, then re-review
- **WARNING** - fix immediately, then re-review
- **SUGGESTION** - fix if trivial, otherwise note it and move on

Proceed only after the reviewer returns PASS, or all CRITICAL/WARNING issues are resolved.

## Step 4: Verify

- `npm run build && npm run lint` in every touched app.
- `npm test` in `apps/api` if tests exist for the touched area.
- Check the task file's own "Готово, когда" list. Its items are phrased "на проде" - if the change isn't deployed and verified yet, say so explicitly in the report; do not claim done.

## Step 5: Record

Append 1-2 lines to `ai-notes.md` (repo root): what was delegated to the agent, what was rewritten by hand, where the model got it wrong. This file is a deliverable (task 10). If an entry for this chunk is already there, don't duplicate it.

## Step 6: Report

Summarise what was implemented, what the reviewer found, verification results, and anything still needed to satisfy the DoD on prod. Show `git diff --stat` and suggest a commit message. **Never commit or push - hard ban, even if asked within this checklist** (`git-operations.md`); the user commits personally.
