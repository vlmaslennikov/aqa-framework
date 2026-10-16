# CLAUDE.md

## Project

Data Room MVP - a take-home assignment. Virtual data room for due diligence: nested folders, PDF uploads, read-only sharing (public link + per-user). Deadline is tight (3 days), so scope discipline matters more than architectural ambition.

Evaluation priorities from the assignment, in order:
1. UX and functionality (edge cases, error states)
2. Design and polish (no unimplemented features visible in UI)
3. Code quality and readability

When a trade-off comes up, resolve it in that order.

## Sources of truth

- `docs/specs/data-room-test-task-ru.md` - the assignment (requirements source of truth).
- `docs/tasks/00-plan.md` + `01`-`10` - the plan; each task file has its own DoD and "грабли".
- `apps/api/CLAUDE.md` / `apps/web/CLAUDE.md` - per-app architecture and conventions. Read the relevant one before touching that app.

## Stack

- `apps/web` - React 19 + TypeScript + Vite, Tailwind 4, shadcn/ui, TanStack Query. Deployed on Vercel.
- `apps/api` - NestJS 11 + Prisma + PostgreSQL. Deployed on Railway.
- File storage: Supabase Storage, private bucket, signed URLs only.
- Auth: email/password, JWT (single access token, no refresh - deliberate MVP cut).
- npm, two independent package.json. No turborepo/nx - deliberate.

## Commands

```bash
# api
cd apps/api
npm run start:dev        # dev server
npx prisma migrate dev   # create/apply migration locally
npx prisma migrate deploy # apply on prod (also runs in start script)
npm run build && npm run lint

# web
cd apps/web
npm run dev
npm run build            # must pass before any commit that touches web
npm run lint
```

## Language

**Everything in the product is English-only:** UI texts, API error messages, validation messages, code identifiers, comments, commit messages, README. No Russian (or any other language) anywhere in the deliverable - the assignment is reviewed by an English-speaking team. Russian is fine only in `docs/tasks/` planning files and chat. Before closing a task, grep for Cyrillic: `grep -rnP '[а-яА-ЯёЁ]' apps/*/src`.

## Definition of done for any task

- Works on the deployed prod URLs, not just localhost (CORS on both api and storage bucket is a known trap - verify on prod).
- Error and empty states handled, not just the happy path.
- `npm run build` passes in both apps.
- The task file's own "Готово, когда" checklist holds.

## Process

- Orchestration, subagent roster, and the feature pipeline: see the imported workflow rules below. `/task-done` runs the closing checklist for a task; `/prod-check` verifies the deployed environment.
- After completing any meaningful chunk, append 1-2 lines to `ai-notes.md` in the repo root: what was delegated, what was rewritten by hand, where the model got it wrong. This file feeds the "AI usage" section of the README and is part of the deliverable (task 10).
- **The agent never commits or pushes - hard ban, no exceptions** (see git rules). When a chunk is ready: `git diff --stat` + a suggested commit message, then stop. The user commits personally, keeping commits small and scoped to one task file from the plan (01-10).

## Rules

@.claude/rules/workflow.md
@.claude/rules/git-operations.md
@.claude/rules/code-style.md
