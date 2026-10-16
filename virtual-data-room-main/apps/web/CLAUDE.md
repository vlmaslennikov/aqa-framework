# apps/web - frontend conventions

React 19 + TypeScript + Vite, Tailwind 4, shadcn/ui, sonner (toasts), lucide-react. Server state: TanStack Query. Deployed on Vercel. Read root `CLAUDE.md` first for priorities and process.

UX and polish are evaluation priority #1 and #2 - the frontend is where the assignment is won or lost.

## Rules

- **shadcn/ui components as-is**; do not hand-roll dialogs, dropdowns, toasts. Toasts via sonner.
- **TanStack Query for all server state.** After mutations invalidate the affected folder keys (both source and target on move). No manual refetch spaghetti, no polling.
- **Lists are paginated**: server list endpoints return `{ items, nextCursor }`, so the client uses `useInfiniteQuery` (never a plain `useQuery` that assumes one response holds everything). Render `data.pages.flatMap(p => p.items)`. Load the next page via an IntersectionObserver sentinel **and** a visible "Load more" button as a keyboard/fallback path. While fetching the next page show skeleton rows *below* the existing rows - the loaded table never collapses back to a full-page skeleton, and a failed next-page fetch never discards what's already on screen.
- **No dead ends.** Every state a user can land in must offer the next action: an empty list gets a create action, a failed load gets Retry, a missing/forbidden resource gets a link back. A screen that only states a fact ("No data room found for your account.") is a defect - the user is stuck with no way forward, and that is exactly what the assignment's "edge cases and error states" criterion is about. Ask of every branch: *what does the user click here?*
- **Every list has a loading skeleton and an empty state** (empty folder says "перетащите файлы сюда"-style guidance, not a blank table). Every mutation shows a toast on success and on error.
- **API errors centrally:** one client with an interceptor - attach JWT, on 401 logout + redirect to /login, on other errors surface the API message in a toast. 404 on a deep link -> "not found or no access" page.
- **Routing:** `/login`, `/register`, `/folder/:id`, `/file/:id`, `/share/:token`, "Shared with me". Deep links work and survive F5.
- **Public share pages (`/share/:token`) are a separate read-only view:** no disabled edit buttons, no edit UI at all. The assignment explicitly forbids visible unimplemented features.
- **Dialogs:** Enter = confirm, Esc = close, autofocus the field on open, buttons disabled while the request is in flight.
- **Upload UX (task 05):** drag-and-drop zone with dragover highlight + Upload button (multiple); per-file progress via XMLHttpRequest (`xhr.upload.onprogress` - fetch has no upload progress); bottom-right upload panel with per-file status and retry; 3-4 parallel uploads, rest queued; non-PDF rejected client-side with a clear message before hitting the api.
- **PDF viewing:** browser-native `<object type="application/pdf">` with a short-lived signed URL; fallback card with a Download button when the browser can't render. No pdf.js.
- **Scaffolding is temporary.** Anything added to prove the skeleton works (the `/health` status readout from task 01, placeholder text, debug output) must be removed as soon as the real feature lands - the API health endpoint stays for prod checks, the UI readout does not. Nothing in the shipped UI exists for the developer rather than the user.
- **Do not add features outside the assignment scope:** no dark mode, no i18n, no custom PDF viewer, no animations for their own sake.

## Forms and validation

- **react-hook-form + zod** (`@hookform/resolvers/zod`) for every form and dialog with input. Schema lives next to the form (`schemas.ts` per feature); the inferred type is the form's value type - never hand-write a parallel interface.
- Errors render **inline under the field** via the shared `FormField` component (label + input + `text-destructive` message, `aria-invalid` / `aria-describedby`), not as a toast. Toasts are for the request result (server error, success), not for field validation.
- `noValidate` on the `<form>` - zod owns validation, so browser tooltips don't compete with it.
- The backend stays the source of truth: client schemas mirror the DTO constraints, they don't replace them. A server error message still goes to a toast.
- **Conventional form UX is expected even when the assignment doesn't spell it out:** password confirmation on sign-up (client-side only - the second field never reaches the API or a DTO), correct `autocomplete` attributes (`name`, `email`, `new-password` / `current-password`), autofocus on the first field, Enter submits. The spec lists requirements, not UI conventions - a form that ignores conventions reads as unfinished.
- **No prop-flag components.** If two screens differ in fields or logic (login vs register), write two components and share the presentational shell (`AuthCard`) - never one component with `name?` / `onNameChange?` optionals and `{condition && <field/>}` inside. Optional props that exist only to serve one caller are a design smell.

## React types

React 19 deprecated `FormEvent` / `FormEventHandler` (they "don't actually exist"). Use `SubmitEvent<HTMLFormElement>`, `ChangeEvent`, `InputEvent`, or plain `SyntheticEvent` as appropriate. With react-hook-form's `handleSubmit` you usually need no event type at all. Never import a symbol the IDE marks deprecated - check the alternative in the type definition first.

## Design tokens

- The brand accent is **blue** (Tailwind blue-600), defined once as `--primary` / `--ring` in `src/index.css`. Do not fall back to the stock shadcn near-black neutral theme, and do not hardcode hex/oklch colors in components - use the semantic classes (`bg-primary`, `text-primary`, `ring`, `text-destructive`, `text-muted-foreground`).
- Neutral grays stay for surfaces, borders, and text; blue is for primary actions, links, focus, and selection. Destructive actions keep the red `--destructive` token.
- Any visual change goes through tokens in `index.css`, never per-component overrides - the UI must stay consistent when the next component is added.

## Project structure

```
src/
  components/         app-wide reusable UI (AppHeader, FormField) + components/ui (shadcn, unmodified)
  features/<domain>/  everything for one domain: pages, components, api calls, schemas, hooks
  lib/                api client, utils
```

- Feature folders map to the assignment's domains: `auth`, `data-room` (folders + files browser), `sharing`. A file lives in the feature it *belongs to*, not in the feature that happened to create it first - a page is not part of `auth` just because auth was built first. When a feature grows past a few files, split it further inside its own folder.
- `features/auth` holds only authentication itself: login/register pages, provider, guards, session hook, auth api and schemas.
- Anything used by two or more features (header, shared field, formatting helper) moves up to `components/` or `lib/` - never imported across sibling feature folders.
- Shadcn primitives in `components/ui` are vendor code: use as-is, don't restyle them per usage.

## Imports

Path alias `@/*` -> `src/*`. Cross-directory imports use `@/...`; plain `./...` only for the same directory and below. `../` imports are forbidden.

## Env

- `VITE_API_URL` only; no hardcoded URLs anywhere.

## Commands

```bash
npm run dev
npm run build   # must pass before any commit that touches web
npm run lint
```
