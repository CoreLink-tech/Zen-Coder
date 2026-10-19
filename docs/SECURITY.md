# Security — Zen-Coder

## Authentication (Phase 3)

- **Library**: Auth.js v5 (`next-auth@5.0.0-beta.32`)
- **Session strategy**: Database sessions (Drizzle adapter)
- **Provider**: Credentials (email + password)
- **Password hashing**: bcrypt (cost factor 12)
- **Secrets**: `AUTH_SECRET` (required in production)

### Route protection

1. **Middleware** (`src/middleware.ts`) — redirects unauthenticated users away from `/coding`, `/automation`, `/settings`.
2. **Server layout** (`(dashboard)/layout.tsx`) — calls `requireUser()` so Server Components never render for anonymous users.
3. **Query helpers** — all data access requires a `userId` and filters by ownership.

### Account status

- Only `status === "active"` users can sign in.
- Suspended / deleted accounts are rejected in `authorize`.

### Roles

- `user` (default) and `admin`.
- `requireAdmin()` helper available for future admin routes.

## Tenant isolation

Every table that holds user data includes a `user_id` foreign key.  
Server-side helpers always include `eq(table.userId, userId)` in the `where` clause.

Cross-user reads or writes are rejected by construction, not by client-side checks.

## Secrets

- Never commit `.env` / `.env.local`.
- Provider API keys stay on the server only.
- Auth secret must be a long random value (`openssl rand -base64 32`).

## Known limitations (Phase 3)

- No rate limiting on login/register yet (to be added).
- No email verification flow yet.
- No OAuth providers yet (GitHub App arrives in Phase 6).
- Auth.js v5 remains in beta as of late 2026; monitor security advisories.
- Better Auth is a recommended alternative for new projects if we revisit auth later.
