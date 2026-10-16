# Agent Workflow Orchestration

How to run work on this project (Data Room MVP: NestJS + Prisma + Postgres, React + Vite + shadcn/ui, npm). Keep root `CLAUDE.md`, the app's `CLAUDE.md`, and the current task's `docs/tasks/` file open as the source of truth.

## 1. General rules
- **Plan first** for any non-trivial task (3+ steps). The plan already exists in `docs/tasks/01-10` - restate the task's DoD before starting instead of re-planning from scratch; re-plan only when reality diverges from the task file.
- If something goes sideways, **stop and re-plan** - don't keep pushing a failing approach.
- **Never mark a task done without proving it works** - build + lint pass, and the feature verified on the deployed prod URL (the DoD in every task file says "на проде", not "on localhost").
- **Scope discipline is the strategy:** UX > polish > code style, nothing outside the assignment, extra credit (search, versioning) only after the entire core scope is closed. Simplicity here means fewer features done completely - not clever abstractions.

## 2. Subagents
- Use subagents to keep the main context clean; **one focused task per subagent**. Offload research, exploration, and parallel analysis.
- Roster (model in parens):
  - `backend-dev` (sonnet) - implements in `apps/api`.
  - `frontend-dev` (sonnet) - implements in `apps/web`.
  - `test-writer` (sonnet) - minimal targeted tests: resolveAccess matrix, resolveName, token scoping. Nothing more.
  - `reviewer` (opus) - data-room-reviewer checklist, read-only.
  - `spec-guardian` (haiku) - checks implementation vs the assignment's functional requirements and access invariants.
- Skills: `data-room-reviewer`, `systematic-debugging`; `engineering:code-review` / `engineering:documentation` when useful.

## 3. Feature pipeline
Use when ANY applies: new/changed module, endpoint, DTO, or guard; a Prisma migration; new/changed page or component; auth or sharing logic; touches more than 2 files. Skip for a typo or a one-line config change.

1. **Frame** - read the task file (01-10), restate its DoD and "грабли" in one line.
2. **Implement** - `backend-dev` and/or `frontend-dev`. Schema changes go through `prisma migrate dev`, never db push.
3. **Test** - `test-writer`, only if the change touches authorization, name conflicts, or public-token scoping. Otherwise skip - tests are not in the assignment's DoD.
4. **Review** - `reviewer`. Critical or Warning -> back to step 2 until clean. Suggestions - fix if trivial.
5. **Spec check** - `spec-guardian` when closing a whole task file (not every sub-change).
6. **Verify** - `npm run build && npm run lint` in the touched app(s); then the feature on the deployed prod URL (`/prod-check` helps). CORS and env are the classic "worked locally" traps.

   **A feature is not "done" because both halves compile.** Backend and frontend are one deliverable: after touching either side, walk the actual user path end-to-end (the request the UI really sends, the response shape it really receives, what renders for an empty result, an error, and a first-time user). Two green builds with a contract mismatch between them is the most expensive kind of failure here - it looks finished and isn't.
7. **Record** - append 1-2 lines to `ai-notes.md` (what was delegated / rewritten / where the model erred). This file is a deliverable (task 10) - written along the way, never reconstructed at the end.
8. **Report** - summary in chat, plus `git diff --stat` and a suggested commit message. **Never commit or push - hard ban** (`git-operations.md`); the user commits personally.

`/task-done` runs steps 4-7 as a closing checklist.

## 4. Bug-fix pipeline (simplified)
1. **Root cause first** - `systematic-debugging` skill; no fixes before the cause is understood.
2. **Fix** - `backend-dev` / `frontend-dev`, minimal diff.
3. **Regression test** - only if the bug was in resolveAccess / resolveName / token scoping territory.
4. **Verify** - build + lint + the scenario on prod.

## 5. Verification toolbox
- api: `cd apps/api && npm run build && npm run lint && npm test`
- web: `cd apps/web && npm run build && npm run lint`
- prod: `/prod-check` (health, CORS, share-link flow in incognito).

**Verify by building, not by running a server.** `npm run build` + `npm run lint` (+ `npm test`) is the agent's proof that code compiles; the human owns the running dev servers.

- **Never start a long-running process in the background** (`npm run start:dev`, `nest start --watch`, `vite`, `npm run dev`) and leave it alive at the end of a task. The human already has these running - a second instance dies with `EADDRINUSE: address already in use :::3000` (api) or silently takes another port (web), and the leftover process keeps holding the port after the task ends.
- If running the server is genuinely required for a check, first confirm the port is free (`lsof -ti tcp:3000`), run it in the foreground, and **kill it before reporting**. Never leave it for the next task.
- After a schema change, the human runs `npx prisma migrate dev` and restarts their own dev server - say so in the report instead of doing it in the background.
- `EADDRINUSE` is not a code failure: it means something already listens on that port. Report it as such, do not "fix" it by changing the app's port or adding fallback-port logic - the port comes from `PORT` env and stays that way.

## 6. Task tracking
- `docs/tasks/00-plan.md` - the backlog with slots and checkpoints; task files 01-10 hold each DoD.
- `ai-notes.md` - the AI-usage log, append-only, fed by step 7 of the pipeline.
- No separate worklog/index files in this project - don't create them.

## 7. Self-improvement loop
After any correction from the user, append the pattern + a rule that prevents it to `docs/lessons.md`. Review `docs/lessons.md` at session start.
