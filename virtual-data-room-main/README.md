# Data Room

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-087EA4?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?logo=reactquery&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase_Storage-3FCF8E?logo=supabase&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?logo=railway&logoColor=white)

A virtual data room for due diligence: nested folders, PDF upload and viewing, and read-only sharing (public link or per-email) with revocation. The original assignment is in [`task.md`](./task.md).

**Live:**
- Web: https://virtual-data-room-ten.vercel.app
- API: https://virtual-data-room-production.up.railway.app (liveness: `/health`)

**Test accounts:**

| Email | Password |
|---|---|
| john@example.com | johnpass |
| viewer@example.com | viewerpass |

## Stack

- **Web** - React 19, TypeScript, Vite, Tailwind 4, shadcn/ui, TanStack Query. Deployed on Vercel.
- **API** - NestJS 11, Prisma, PostgreSQL. Deployed on Railway.
- **File storage** - Supabase Storage, private bucket, signed URLs only (the API never proxies file bytes).
- **Auth** - email/password, JWT.
- Two independent `package.json` (`apps/web`, `apps/api`), no monorepo tooling - deliberate, the project is small enough that a build orchestrator would be pure overhead.

## Running locally

Requirements: Node 20.19+ (or 22.12+), a PostgreSQL database (this project targets Supabase's Postgres, including its connection pooler), a Supabase Storage bucket.

### API (`apps/api`)

```bash
cd apps/api
npm install
cp .env.example .env   # fill in the values below
npx prisma migrate dev
npm run start:dev
```

Env vars (see `.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase's **transaction pooler** (port 6543). Must include `?pgbouncer=true&connection_limit=1` - without it, Prisma's prepared statements collide on a pooled connection and queries intermittently fail with `prepared statement "s0" already exists`. |
| `DIRECT_URL` | Supabase's **direct/session** connection (port 5432), used only by `prisma migrate`. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_BUCKET` | Storage bucket the API issues signed upload/view/download URLs against. The bucket must allow `PUT` and the `apikey`/`x-upsert` headers in its CORS config, or uploads fail silently in the browser. |
| `JWT_SECRET` | Signs the single access token (7-day expiry, no refresh - see "Cut from MVP" below). |
| `CORS_ORIGIN` | Comma-separated allowed origins for the web app. Defaults to allow-all if unset - fine locally, set it explicitly in production. |
| `PORT` | Defaults to `3000`. |

`npm install` also generates the Prisma client (via `@prisma/client`'s own postinstall hook) - no separate `prisma generate` step needed. `npm run build && npm run lint && npm test` before pushing.

### Web (`apps/web`)

```bash
cd apps/web
npm install
cp .env.example .env   # fill in the values below
npm run dev
```

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the API (e.g. `http://localhost:3000` locally). |
| `VITE_SUPABASE_ANON_KEY` | Sent as the `apikey` header when the browser uploads a file directly to the signed Supabase Storage URL the API hands back - the anon key is safe to ship to the client, it only authorizes the specific signed operation. |

`npm run build && npm run lint` before pushing.

## Project decisions

**Presigned uploads, not proxied bytes.** The API never touches file contents. It issues an upload intent (ownership + MIME type + size check) and a Supabase signed URL; the browser `PUT`s the file straight to storage and then calls back to confirm. This keeps the API stateless with respect to file size and avoids ever holding a multi-hundred-MB PDF in server memory. View/download URLs are short-lived (5 minutes) so revoking a share actually revokes access; the upload URL itself doesn't need that constraint, since it's only usable to write the one object it was issued for.

**Materialized path for the folder tree.** Every `Folder.path` stores the chain of ancestor folder ids as a slash-separated string ending in the folder's own id (a folder two levels deep has path `grandparentId/parentId/selfId/`) - the room id isn't part of it, that boundary is tracked separately. Subtree operations - delete-preview counts/size, share inheritance, breadcrumb trimming - are a single `path LIKE 'prefix%'` query with an index on `path`, not a recursive CTE. The trade-off is that moving a folder would need to rewrite `path` on its whole subtree; folder move isn't implemented (see below), so this hasn't been exercised in practice yet.

**`storageKey` is independent of the file name.** It's a UUID assigned at upload, never derived from or updated by the display name. Renaming a file is a single DB row update; the bucket object is untouched.

**Sharing is one polymorphic table.** `Share` has `resourceType` (`DATAROOM`/`FOLDER`/`FILE`) + `resourceId` with no foreign key - a share can point at any of the three resource types. `mode` picks public-link vs per-email; access resolution (`resolveAccess`) walks the target resource's own ancestor chain (built from the same materialized path) and checks whether any active share covers a node in that chain, which is how "share a folder" implies read access to everything nested inside it without a separate inheritance table.

**Email/password, not OAuth.** A reviewer opening this cold shouldn't need to configure an OAuth app or redirect URI just to log in. Simpler surface, one less deployed dependency.

**Deliberately cut from MVP:**
- **Refresh tokens.** A single 7-day JWT, no rotation or silent refresh. A leaked token is valid until it expires; there's no server-side revocation short of changing the secret. Acceptable for a demo, not for production.
- **Cleanup of abandoned uploads.** An upload intent creates a `File` row before the browser finishes `PUT`ing the bytes; if the tab closes mid-upload, that row (and, in rarer partial-write cases, a bucket object) never gets a `completeUpload` call and never gets garbage-collected. It's filtered out of every listing (`uploadedAt: null`), so it's invisible to users, but it lingers in the database and possibly the bucket.
- **Moving a folder.** Files can be moved between folders; folders themselves can be renamed and deleted, but not relocated into a different parent. The materialized-path design above supports it, but the mutation (rewriting `path` on a whole subtree, and re-checking name conflicts at the destination) wasn't built.
- **Search and versioning** - both explicitly optional in the assignment, not started; see "How it scales" below for the shape a search index would take.

## Data model

```mermaid
erDiagram
    User ||--o{ DataRoom : owns
    DataRoom ||--o{ Folder : contains
    DataRoom ||--o{ File : contains
    Folder ||--o{ Folder : "parent of (self-ref)"
    Folder ||--o{ File : contains
    DataRoom ||--o{ Share : "shared (polymorphic)"
    Folder ||--o{ Share : "shared (polymorphic)"
    File ||--o{ Share : "shared (polymorphic)"

    User {
        uuid id PK
        string email UK
        string name
        string passwordHash
    }
    DataRoom {
        uuid id PK
        string name
        uuid ownerId FK
    }
    Folder {
        uuid id PK
        string name
        string nameLower "conflict check + sort"
        uuid dataRoomId FK
        uuid parentId FK "null = room root"
        string path "materialized path"
    }
    File {
        uuid id PK
        string name
        string nameLower
        uuid dataRoomId FK
        uuid folderId FK "null = room root"
        int size
        string mimeType
        string storageKey "bucket object id, independent of name"
        datetime uploadedAt "null until upload confirmed"
    }
    Share {
        uuid id PK
        string resourceType "DATAROOM / FOLDER / FILE"
        uuid resourceId "polymorphic - no FK"
        string mode "PUBLIC_LINK / USER"
        string token UK "null unless PUBLIC_LINK"
        string granteeEmail "null unless USER"
        string role "VIEWER / EDITOR, only VIEWER used today"
        string createdById "who created the share, not an enforced FK"
        datetime revokedAt "null while active"
    }
```

`Share.resourceId` deliberately has no foreign key - it can reference `DataRoom`, `Folder`, or `File` depending on `resourceType`, and a share outlives the row it points at (a deleted resource leaves a dangling share, which read paths filter out rather than treat as an error). `Folder` and `File` both carry a nullable `folderId`/`parentId` - `null` means "lives at the room's root" rather than needing a separate root marker row.

## How it scales

**Aggregate size and item count for a folder, including its whole subtree.** Today: a raw SQL aggregate over `path LIKE 'prefix%'` (backing the delete-preview panel), using the index on `path` - one query, no recursion, regardless of tree depth. This is fine for an occasional pre-delete check but doesn't scale to showing "size" on every folder row in a listing, since each row would trigger its own subtree scan. The next step is denormalized counters (`size`, `itemCount`) stored directly on `Folder`, updated either transactionally inside each mutation (folder create/delete, file upload/delete/move) for immediate consistency at the cost of extra lock contention on deep trees, or asynchronously via a queue for cheaper writes at the cost of a brief staleness window. Either way the read path stays O(1) per folder instead of O(subtree size).

**100,000 files in one data room.** Already the operating assumption, not a hypothetical: every listing endpoint returns one folder level at a time (never the whole room flattened), paginated with keyset cursors over composite indexes - `(dataRoomId, parentId, nameLower, id)` for folders, `(dataRoomId, folderId, nameLower, id)` for files, `(resourceType, resourceId, createdAt, id)` / `(granteeEmail, createdAt, id)` for shares - so a page costs `O(page size)` regardless of how many siblings exist, and no listing endpoint runs `COUNT(*)` over the room (the delete-preview subtree aggregate is the one deliberate exception, and it's not on a list-rendering path). What's genuinely missing at that scale is name search across the whole room; the assignment lists it as optional, and the honest answer for when it's needed is a trigram index (`pg_trgm`) rather than `LIKE '%x%'`, since a B-tree on `nameLower` only accelerates prefix matches.

**Viewer/editor roles.** `Share.role` already exists in the schema (`VIEWER` / `EDITOR`); only `VIEWER` is exercised today because the assignment only asks for read access. Turning `EDITOR` into real permissions doesn't touch the model - it's a handful of call sites in the authorization layer, not a redesign: widen the `AccessLevel` union to include `EDITOR`, stop `resolveAccess` from collapsing every share to `VIEWER` regardless of `role`, and let the mutation endpoints that currently hardcode a required level of `OWNER` also accept `EDITOR` (while keeping share management owner-only). Growing further - a default role per room, or shares granted to a group rather than one email - would build on the same `Share` row shape, just with a different `granteeEmail` resolution step.

## Where AI was used

All code in this repository was written by an agent (Claude Code). I was responsible for the task breakdown, the architectural decisions, the API contracts, reviewing every diff with targeted point fixes - and for commits, database migrations, and production checks, all of which the project rules ban the agent from doing.

### How I organized the work

An orchestrator plus a fixed roster of subagents: backend-dev (`apps/api` only), frontend-dev (`apps/web` only), test-writer (targeted tests only for access control, name conflicts, and public tokens), reviewer (mandatory review of every change, read-only), spec-guardian (checks the implementation against the assignment's requirements when closing a task).

The cycle for every feature: a task statement with done criteria -> backend/frontend working in parallel against a contract I fixed up front -> tests -> review (critical findings send the task back) -> spec check -> `build + lint + test` -> my check on prod. The access-control core (`resolveAccess`, the ancestor chain built from the materialized path) was not delegated to subagents - the main agent wrote it directly, and I reviewed that code the most closely: a bug there is a data leak, not a UI glitch.

### Where the agent got it wrong

The grossest one - lists without pagination: by default the agent pulled a whole level or hierarchy in one query, and even once the keyset pattern already existed in the codebase, a new folder-picker endpoint again returned everything at once (`take: 1000`). I rejected that solution outright at review - it was redone as per-level loading with `hasChildren`, and I added a rule to the project: "every list endpoint is paginated; an unbounded `findMany` is a defect".

The rest caught at review:

- breadcrumbs returned the names of all ancestors - a viewer saw folder names above the share boundary (an information leak);
- the delete preview required the VIEWER level instead of OWNER;
- a cross-user cache leak: logout didn't clear the client cache, so a new user saw the previous user's folders; separately, a cache key without the room id mixed one's own room with someone else's shared room;
- the public "view" endpoint forced a download instead of inline PDF display from its very first implementation;
- after the move to infinite scroll, the share dialog only saw the first page - the public link "got lost" and creating a new one became a silent no-op; it took a second review pass to close this fully;
- a race at registration returned 500 instead of 409, and creating the user together with their room wasn't a single transaction;
- upload retry created a new intent - the file got duplicated as "name (1).pdf"; the upload panel's close button disappeared after the first error;
- deleting a folder never cleaned up storage: the service computed the list of keys, the controller discarded it;
- download opened via `window.open` with no file name (a UUID instead of the name, at risk of popup blocking);
- empty folder names passed validation (trim only on the frontend); backend validation messages weren't shown (an array instead of a string); there was no SPA fallback - F5 on prod would have given a 404;
- the Download button inside a clickable row fired together with the row navigation; the keyboard variant of this bug slipped past me and two review rounds;
- a subagent assigned only to `apps/api` edited a file in `apps/web` along the way; another time the agent rewrote a file from a stale copy in its context and wiped my parallel edit;
- a background dev server was left holding port 3000 after a task (EADDRINUSE).

It's because of mistakes of this kind that I kept review mandatory for every change, including the "simple" ones, and ran the final pass over all scenarios on prod by hand.
