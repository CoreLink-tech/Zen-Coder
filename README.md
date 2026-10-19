# Zen-Coder

Commercial AI platform with two workspaces on **one shared credit balance**:

- **Coding** — repository-aware agent, GitHub integration, approval-gated writes  
- **Automation** — workflows, HTTP/browser checks, schedules, webhooks  

## Status

**Phases 0–16 complete** — core product is deployment-ready.  
See `docs/PROJECT_STATUS.md`, `docs/DEPLOYMENT.md`, and `docs/LAUNCH_CHECKLIST.md`.

## Stack

- Next.js App Router + TypeScript + Tailwind  
- Turso/libSQL + Drizzle  
- Auth.js (credentials + DB sessions)  
- OpenAI / Anthropic / DeepSeek  
- GitHub App (Octokit)  
- Stripe billing  
- Playwright (optional browser steps)  
- Vercel (cron + hosting)

## Quick start

```bash
cp .env.example .env.local
# set AUTH_SECRET and at least one AI provider key

npm install
npm run db:push
npm run dev
```

Open http://localhost:3000 — register, then use Coding / Automation / Settings.

```bash
# Optional
npm run playwright:install   # browser automation
npm run typecheck
npm run build
```

## Production

1. Follow **`docs/DEPLOYMENT.md`** (env matrix, Vercel, Turso, webhooks)  
2. Run **`docs/LAUNCH_CHECKLIST.md`** smoke tests  
3. Promote an admin: `UPDATE users SET role = 'admin' WHERE email = '…'`  

## Documentation

| Doc | Topic |
|-----|--------|
| `docs/DEPLOYMENT.md` | Env vars, Vercel, DB |
| `docs/LAUNCH_CHECKLIST.md` | Smoke tests |
| `docs/SECURITY.md` | Threat model |
| `docs/OPERATIONS.md` | Runbooks |
| `docs/BILLING.md` | Stripe |
| `docs/GITHUB.md` | GitHub App |
| `docs/AUTOMATION_ENGINE.md` | Workflows |
| `docs/CREDITS_AND_BILLING.md` | Ledger |

## License

Proprietary — CoreLink-tech / Zen-Coder.
