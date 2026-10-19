# Project Status — Zen-Coder

## Current Phase

**Phase 4 — AI provider adapters** (completed this session)

## Completed Work

### Phase 0–1
- Next.js foundation, shared shell, Coding / Automation / Settings workspaces

### Phase 2
- Drizzle + Turso schema, ownership-enforced queries

### Phase 3
- Auth.js credentials auth, middleware, register/login, tenant isolation

### Phase 4
- Common `AiProvider` interface and normalized responses
- DeepSeek adapter (OpenAI-compatible, `https://api.deepseek.com`)
- Anthropic Claude adapter (`@anthropic-ai/sdk`)
- OpenAI adapter (`openai` SDK)
- Model registry with Oct 2026 IDs and reference pricing
- `chat()` helper with cost/credit estimates
- `GET /api/ai/providers` (auth-gated, no keys exposed)
- `docs/AI_PROVIDERS.md`

## Next Phase

**Phase 5 — Shared agent engine and Coding interface**

- Agent tasks + conversation persistence wiring
- Planning and tool-call handling
- Coding workspace interaction flow
- Task progress / error handling

## Known Limitations

- Provider SDKs need `npm install` locally
- No live API calls verified in this environment (no keys)
- Streaming not yet implemented
- Usage is captured but not yet written to the credit ledger (Phase 8)

## Branch

- `main`
