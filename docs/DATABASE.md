# Database — Zen-Coder

## Stack

- **Database**: Turso (libSQL) — SQLite-compatible, edge-friendly
- **ORM**: Drizzle ORM
- **Migrations**: Drizzle Kit (`drizzle/` folder)
- **Local fallback**: `file:local.db` when `TURSO_DATABASE_URL` is unset

## Schema Overview (Phase 2)

| Table                    | Purpose                                      | Ownership      |
|--------------------------|----------------------------------------------|----------------|
| `users`                  | Accounts                                     | —              |
| `projects`               | User projects (coding / automation / shared) | `user_id`      |
| `repositories`           | GitHub repo connections                      | `user_id`      |
| `conversations`          | Chat threads                                 | `user_id`      |
| `messages`               | Conversation messages                        | via conversation |
| `agent_tasks`            | Agent task runs                              | `user_id`      |
| `workflows`              | Automation workflows                         | `user_id`      |
| `workflow_versions`      | Versioned workflow definitions               | via workflow   |
| `workflow_executions`    | Execution history                            | `user_id`      |
| `credit_accounts`        | Shared credit balance (stub)                 | `user_id`      |
| `credit_ledger_entries`  | Auditable ledger (stub)                      | `user_id`      |

All user-owned tables enforce ownership via `user_id` foreign keys and cascade / restrict rules.

## Access Patterns

Server-side helpers live in `src/lib/db/queries.ts`.

- Every query that returns user data takes a `userId` argument.
- Lookups use `and(eq(table.id, id), eq(table.userId, userId))`.
- Creating a user automatically creates a zero-balance credit account.

**Never** expose raw Drizzle queries that omit the ownership check to route handlers.

## Commands

```bash
# Generate migration SQL from schema changes
npm run db:generate

# Apply migrations (requires TURSO_DATABASE_URL or local.db)
npm run db:migrate

# Push schema directly (dev only)
npm run db:push

# Open Drizzle Studio
npm run db:studio
```

## Environment

```env
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

If both are unset, the client uses `file:local.db` (gitignored).

## Notes for later phases

- Credit ledger concurrency and idempotency will be hardened in Phase 8.
- Workflow step-level execution tables may be split out when the automation engine lands (Phase 9).
- Auth.js session tables will be added in Phase 3.
