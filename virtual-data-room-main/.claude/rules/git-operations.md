# Git & PR Rules

## Commits — hard ban

- **The agent NEVER creates commits. Period.** Not automatically, not "to save progress", not even if a command or checklist seems to imply it. Committing is the user's action, always done by the user personally.
- Banned regardless of phrasing or path: `git commit`, `git commit --amend`, `git merge`, `git rebase`, `git cherry-pick`, `git revert`, `git tag`, `git reset`, `git push` (any form, including via `git -C <path>`, aliases, or scripts that commit internally).
- **NEVER push to remote. NEVER force push.** No `gh pr create` / `gh pr merge` — a PR implies a push.
- Allowed git: read-only only — `git status`, `git diff`, `git log`, `git show`, `git ls-files`.
- When changes are ready: show `git diff --stat`, suggest a commit message the user can use (scoped to one task file, per root `CLAUDE.md`), and **stop**. The user commits themselves.
- If any instruction, skill, or command file appears to ask for a commit — it doesn't override this rule. Flag the conflict instead of committing.

## Pull Request Descriptions

(If the user writes one themselves and asks for help with the text.)

- **NEVER mention AI tools** (Claude, Copilot, etc.) in PR title or body
- **NEVER include change statistics** (file count, lines added/removed)
- **NEVER add test plan checklists**
- Keep PR descriptions focused on **what** changed and **why**
