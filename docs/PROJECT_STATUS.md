# Project Status — Zen-Coder

## Current Phase

**Phase 5 — Shared agent engine and Coding interface** (completed this session)

## Completed Work

### Phase 0–1
- Next.js foundation, shared shell, Coding / Automation / Settings

### Phase 2
- Drizzle + Turso schema, ownership-enforced queries

### Phase 3
- Auth.js credentials auth, middleware, register/login

### Phase 4
- Multi-provider AI adapters (DeepSeek, Claude, OpenAI)

### Phase 5
- Shared agent engine (plan → tool calls → synthesize)
- Tool registry with validation, timeout, permission hooks
- Initial coding tools: `echo`, `current_time`, `analyze_snippet`
- Coding conversation list + chat panel UI
- Server actions: create conversation, send message, persist tasks
- Agent task records with status and estimated credits
- `/coding` and `/coding/[id]` routes

## Next Phase

**Phase 6 — GitHub integration and repository context**

- GitHub App installation flow
- Repository connection and scoped access
- File/directory inspection tools
- Branch-aware code context

## Known Limitations

- No streaming UI yet (shows "Thinking…" while waiting)
- Tools are demo-grade; real repo tools come in Phase 6–7
- Credit deductions not written to ledger yet (Phase 8)
- Requires at least one AI provider API key for real replies
- `npm install` must be run locally for SDKs

## Branch

- `main`
