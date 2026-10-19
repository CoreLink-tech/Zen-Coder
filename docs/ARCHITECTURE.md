# Architecture — Zen-Coder

## Overview

Zen-Coder is a single Next.js application that exposes two primary workspaces (Coding and Automation) sharing:

- Authentication & user identity
- One credit balance / ledger
- Provider configuration
- Core agent engine and tool registry

Future cybersecurity capabilities will reuse the same agent engine, tools, workers, and accounting.

## High-Level Layers

```
┌─────────────────────────────────────────────────────────┐
│  Web UI (Next.js App Router)                            │
│  - Coding workspace                                     │
│  - Automation workspace                                 │
│  - Settings / Account                                   │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  API Routes / Server Actions                            │
│  - Auth, authorization, rate limits                     │
│  - Credit checks & reservations                         │
│  - Tool permission enforcement                          │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Shared Core                                            │
│  - AI Provider abstraction (DeepSeek / Claude / OpenAI) │
│  - Agent engine (planning → tool calls → synthesis)     │
│  - Tool registry                                        │
│  - Credit ledger                                        │
└───────────┬─────────────────────────────┬───────────────┘
            │                             │
┌───────────▼──────────┐      ┌───────────▼──────────────┐
│  Coding tools        │      │  Automation tools        │
│  - GitHub context    │      │  - HTTP / monitoring     │
│  - File edit / diff  │      │  - Browser (Playwright)  │
│  - Test runners      │      │  - Schedulers            │
└──────────────────────┘      └──────────────────────────┘
            │                             │
┌───────────▼─────────────────────────────▼──────────────┐
│  Persistence (Turso / libSQL + Drizzle)                 │
│  Background workers & isolated execution environments   │
└─────────────────────────────────────────────────────────┘
```

## Key Design Principles

1. **One credit balance** — All AI usage (Coding + Automation) draws from a single ledger.
2. **Server-side enforcement** — Permissions, credits, and tool authorization are never trusted to the client or the model.
3. **Isolated execution** — Untrusted code and browser sessions run outside the main Next.js process.
4. **Extensibility** — New workspaces (e.g. Cybersecurity) and tools can be added without rewriting the agent core.
5. **Honest accounting** — Usage is recorded from provider data; estimates are reconciled.

## Deployment Target

- Frontend + API: Vercel
- Database: Turso
- Workers / long-running automation: separate process or platform (to be decided in Phase 11)
