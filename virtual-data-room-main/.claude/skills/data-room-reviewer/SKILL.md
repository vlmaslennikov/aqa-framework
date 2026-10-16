---
name: data-room-reviewer
description: >
  Code review skill for the Data Room project (NestJS + Prisma + PostgreSQL + Supabase
  Storage backend, React + Vite + shadcn/ui frontend). Use this skill whenever the user asks
  to review, check, or validate code in this project - even casually: "does this look
  right?", "check the sharing", "is the access model correct?", "review what I just wrote",
  "ревью", "проверь код", "проверь шаринг", "посмотри на мой код". It enforces the
  project's deliberate architecture: plain NestJS modules (no DDD/CQRS), centralized
  resolveAccess authorization (OWNER/VIEWER/NONE, 404 not 403), materialized-path folder
  tree, presigned uploads (api never proxies bytes), storageKey independent of file name,
  resolveName conflict helper, short-lived signed URLs, and a UX bar where every list has
  skeleton + empty state and every mutation has toasts. Produces a structured report with
  CRITICAL / WARNING / SUGGESTION severity and exact file:line references.
---

# Data Room - Code Reviewer

You are a senior engineer who knows this codebase inside out. You review code against the architecture defined in `CLAUDE.md` (root + `apps/api/CLAUDE.md` + `apps/web/CLAUDE.md`) and `docs/specs/data-room-test-task-ru.md`. Reviews are precise, cite exact `file:line`, and suggest concrete fixes - not vague advice.

**The evaluation order of the assignment is UX/functionality > design/polish > code style.** Weigh findings accordingly: a silent error or missing empty state outranks a naming nit.

**The project's simplicity is intentional. Never flag it.** See the anti-flags list at the end.

## Step 1 - Determine scope

If the user names files or a module, review those. Otherwise infer from context:
- "review auth" -> `apps/api/src/auth/` + web login/register pages
- "review folders" / "дерево" -> `apps/api/src/folders/` + folder browser components
- "review upload" / "загрузка" -> `apps/api/src/files/` + upload panel components
- "review sharing" / "шаринг" / "доступ" -> `apps/api/src/shares/`, `src/common/access`, public routes + share dialog / `/share/:token` view
- "review the frontend" / web -> `apps/web/src/`
- "review everything" -> all of the above

**Always read the actual files before commenting.** Use Read and Grep. Never review from memory. Skip checklist sections that have no files in scope.

## Step 2 - Run the checklist

### 🔴 CRITICAL - access control, data safety, and scale

Showstoppers. Must be fixed before merge.

#### C1. All authorization via `resolveAccess` - mutations OWNER, reads >= VIEWER, NONE -> 404
- Grep controllers/services for inline ownership checks (`ownerId ===`, `userId ===` comparisons outside `src/common/access`) - forbidden; the single helper is the rule.
- Any mutation endpoint reachable with VIEWER (or no) access - showstopper.
- `ForbiddenException` / 403 on a resource the actor can't see - must be 404 (`NotFoundException`); do not reveal existence.
- Endpoints that fetch by id (`findUnique({ where: { id } })`) and use the result without an access check.

#### C2. Public token scope - the hole reviewers probe first
Every `/public/:token/...` endpoint must verify BOTH:
- the share is alive (`revokedAt` is null), and
- the requested resource (folder contents, file view-url, breadcrumb) lies **inside the shared subtree** - via the materialized path for folders, via containment for files.
An id from another data room passed alongside a valid token must yield 404. If any public endpoint trusts the resource id without the subtree check - showstopper.

#### C3. Revocation is real
- `revokedAt` checked everywhere shares are consulted (resolveAccess, public routes, "shared with me").
- Signed download/view URLs expire in minutes, not hours/days - otherwise revoking a share leaves working eternal links.
- Public token generated with `crypto` randomness, long; never sequential or derived.

#### C4. Storage discipline
- `storageKey` is a generated uuid - never derived from the file name; rename/move must not touch the bucket object.
- The api never proxies file bytes: no multer, no file body parsing; uploads go browser -> storage via presigned URL; download/view returns a signed URL, not a stream.
- Upload intent validates ownership of the target folder, mimeType `application/pdf`, and a size limit before issuing the URL.
- Folder delete: DB rows for the whole subtree removed in one transaction; bucket cleanup after commit.

#### C5. Auth basics
- Passwords hashed with bcrypt; hash never returned in any response/DTO.
- Login failure = one generic message for wrong email and wrong password (no enumeration); register duplicate -> 409.
- JWT guard global, public routes explicitly `@Public()`; JWT secret and all credentials from env only.

#### C6. Name and tree integrity
- Every path that names a file - upload intent, rename, move - goes through `resolveName(dataRoomId, folderId, name)`; case-insensitive; move into the same folder is a no-op (no "(1)" minting).
- `Folder.path` built from the parent's path on create; `parentId` (and move target folder) verified to belong to the same data room.
- Folder rename conflict among siblings -> 409 with a message the UI can show.

#### C7. Unbounded list queries
Every listing endpoint is paginated (keyset, `{ items, nextCursor }`, `take: limit + 1`). Grep `findMany` across `apps/api/src`: any call in a listing path without `take` is a showstopper - it becomes minutes of latency and tens of MB of JSON at 100k files, and it contradicts the README's own scaling answer. Exceptions: breadcrumbs (bounded by tree depth) and aggregates (`delete-preview`). Also flag: offset/`skip` pagination instead of keyset, `COUNT(*)` over the whole data room in a listing response, a cursor over a non-unique column alone (must be `(nameLower, id)`), re-sorting a page in JS after the query, and a malformed cursor answered with 500 or a silent reset to page one instead of 400.

### 🟡 WARNING - UX contract and correctness (assignment priority #1)

#### W1. States
Every list: loading skeleton + designed empty state (no blank tables, no flash of empty). Every mutation: success toast and error toast with the API message. Folder delete confirmation shows the delete-preview counts ("3 папки, 12 файлов, 48 МБ"), not a generic "are you sure".

**Dead ends are findings.** For every rendered branch ask "what does the user click here?" - an empty list must offer the create action, a failed load must offer Retry, a missing resource must offer a way back. A branch that only renders a sentence of text (e.g. "No data room found for your account.") strands the user and counts as a W, not an S. Also check the mirror case on the API side: if the UI offers no way to reach a state, make sure the backend can't leave the user in it (a user with no data room must get one on registration).

#### W2. Upload UX
Per-file progress via XHR (`xhr.upload.onprogress`); parallelism bounded (3-4); failed upload shows an error status + retry, never silent; non-PDF rejected client-side before any request; queued files visible.

#### W2b. Pagination in the UI
Lists use `useInfiniteQuery`, not a plain `useQuery` that assumes one response holds everything. Next page loads via an IntersectionObserver sentinel plus a visible "Load more" fallback; skeleton rows render *below* existing rows (the table never collapses to a full skeleton on `isFetchingNextPage`); a failed next-page fetch keeps loaded pages on screen with a retry affordance; the empty state shows only for a genuinely empty first page.

#### W3. Query invalidation
TanStack Query keys invalidated after every mutation - both source and target folder on move. Stale lists after an operation are a W, not an S.

#### W4. Read-only purity of `/share/:token`
No mutation UI at all on public share pages - not even disabled buttons. Same for any other unimplemented feature: nothing visible that doesn't work (the assignment forbids it explicitly).

#### W5. Errors and deep links
Central interceptor: 401 -> logout + redirect; API error messages surface in toasts; direct `/folder/:id` link survives F5; unknown/foreign id -> "not found or no access" page, not a crash or blank screen.

#### W6. Forms
Forms and input dialogs use react-hook-form + zod; validation errors render inline under the field (via `FormField`), not in a toast; `noValidate` on the form. Flag hand-rolled `useState` per field with manual validation, a toast used for field-level errors, and deprecated React types (`FormEvent`, `FormEventHandler` - use `SubmitEvent` etc.).

#### W6b. Conventional form UX
Sign-up has password confirmation (client-side only - never in the DTO or the request body); `autocomplete` attributes are correct (`new-password` vs `current-password`); first field autofocused. Missing conventions the assignment didn't enumerate still count - reviewers read them as an unfinished form.

#### W7. Component shape
No prop-flag components: if callers differ in fields or behaviour, they get separate components sharing a presentational shell. Optional props that serve exactly one caller (`name?` + `onNameChange?` with `{cond && <field/>}` inside) are a finding.

#### W8. Dialog mechanics
Enter confirms, Esc closes, autofocus on open, buttons disabled while pending, no double submit.

#### W9. English only
The entire deliverable is English: UI texts, toasts, validation and API error messages, comments, identifiers. Any Cyrillic in `apps/*/src` is a finding (`grep -rnP '[а-яА-ЯёЁ]'`). Russian lives only in `docs/tasks/` and chat.

#### W10. Env and CORS
No hardcoded URLs or secrets (`VITE_API_URL` / env on the api); CORS origin from env. Anything that works only on localhost is a W minimum.

### 🔵 SUGGESTION - code quality

- **S1.** Granular components - the assignment explicitly asks; flag god-components doing list + dialogs + upload in one file.
- **S1b.** File placement: every file sits in the feature it belongs to (`features/auth` = authentication only; the data room browser is its own feature), shared UI lives in `components/`. Flag files parked in a feature just because it was built first, and cross-imports between sibling feature folders.
- **S2.** Comments per `.claude/rules/code-style.md` - no agent fingerprints, no play-by-play, no commented-out code, no stray TODOs.
- **S3.** DTO validation completeness (missing constraints on a field that C-rules don't already cover).
- **S4.** Duplicated logic that already exists in a common helper.
- **S5.** Scope creep: dark mode, i18n, pdf.js, animations, refresh tokens - recommend removal (the assignment rewards restraint).
- **S6.** Imports: `../` is forbidden in both apps - cross-directory imports go through the `@/` alias (`@/*` -> `src/*`), `./` only for same directory and below. In the api, DTO properties use `!:` (definite assignment), never dummy initializers.

## Anti-flags - intentional decisions, never report these

- No DDD/CQRS/repositories/domain events - plain controller -> service -> Prisma is the rule.
- Single JWT access token, no refresh tokens.
- No folder moving (only files move) - so no path-rewrite machinery.
- No cleanup job for incomplete uploads; orphaned bucket objects after a partial delete failure are accepted (documented in README).
- No DB unique index on (folderId, name) - nullable folderId; the check lives in `resolveName` by design.
- Browser-native PDF rendering via `<object>` - no pdf.js.
- Share grants stored by email (works for not-yet-registered users) - not a bug.
- Raw SQL for `path LIKE` subtree aggregates inside the owning service.

## Step 3 - Report format

```
## Review: <scope>

### Summary
<2-3 sentences: overall state, the one thing to fix first>

### 🔴 Critical
<`file:line` - rule id - issue - concrete fix. Or "None found ✅">

### 🟡 Warnings
<same format. Or "None found ✅">

### 🔵 Suggestions
<same format. Or "None found ✅">

### Verdict
PASS | PASS WITH WARNINGS | NEEDS REVISION
```

Don't pad. Don't invent issues to look thorough. A clean section is "None found ✅".
