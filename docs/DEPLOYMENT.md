# Deployment — Zen-Coder

## Target

Recommended: **Vercel** (Next.js App Router) + **Turso** (libSQL) + **GitHub App** + **Stripe**.

## Environment variable matrix

| Variable | Required | Notes |
|----------|----------|--------|
| `AUTH_SECRET` | Yes (prod) | `openssl rand -base64 32` |
| `AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Yes | Public site URL |
| `TURSO_DATABASE_URL` | Yes (prod) | libSQL URL |
| `TURSO_AUTH_TOKEN` | Yes (prod) | Turso token |
| `DEEPSEEK_API_KEY` and/or `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY` | ≥1 | AI providers |
| `GITHUB_APP_ID` | For GitHub | |
| `GITHUB_APP_PRIVATE_KEY` | For GitHub | PEM; `\n` for newlines in env |
| `GITHUB_APP_CLIENT_ID` | For GitHub | |
| `GITHUB_APP_CLIENT_SECRET` | For GitHub | |
| `GITHUB_APP_SLUG` | For install URL | |
| `CRON_SECRET` | Yes (prod) | Protects `/api/cron/process-jobs` |
| `STRIPE_SECRET_KEY` | For billing | |
| `STRIPE_WEBHOOK_SECRET` | For billing | |
| `STRIPE_PRICE_*` | For billing | Plan/pack prices |

## Database

```bash
npm install
npm run db:push          # push schema to Turso / local
# or npm run db:generate && npm run db:migrate when using migration files
```

Local without Turso: leave Turso vars empty; Drizzle uses a local file DB if configured that way in `src/lib/db`.

## Vercel

1. Import the GitHub repo  
2. Set all production env vars  
3. Deploy  
4. `vercel.json` already schedules `/api/cron/process-jobs` every minute  
5. Stripe webhook → `https://<domain>/api/billing/webhook`  
6. GitHub App callback → `https://<domain>/api/github/callback`  

## Post-deploy seed (admin)

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

## Smoke tests

See `docs/LAUNCH_CHECKLIST.md`.

## Monitoring

- Uptime: `GET /api/health`  
- Logs: structured JSON on stdout (`logger`)  
- Admin: `/admin` for failures and usage  

## Known limitations at launch

- In-memory rate limits (not shared across serverless isolates)  
- Browser automation needs Playwright + Chromium on the runtime (may need dedicated worker host for heavy use)  
- Multi-file GitHub commits are sequential Contents API commits  
- No cybersecurity workspace yet (Future phase)  
