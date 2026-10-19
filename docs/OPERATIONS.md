# Operations Playbook — Zen-Coder

## Promote an admin

Update the user’s role in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

Then open `/admin`.

## Health

`GET /api/health` — database reachability, Stripe/GitHub/AI config flags.  
Use for uptime monitors. Returns 503 if DB is down.

## Common failures

### Agent replies empty / errors
1. Check `/admin/failures` for task errors  
2. Verify AI provider API keys in env  
3. Inspect structured logs for `provider` / `model`  

### Workflow schedule not running
1. Confirm workflow status is `active` and schedule `enabled`  
2. Hit `/api/cron/process-jobs` with `CRON_SECRET`  
3. Check `background_jobs` for `pending` / `failed`  

### Credits not granted after payment
1. Confirm Stripe webhook signature and `STRIPE_WEBHOOK_SECRET`  
2. Look for ledger `operationId` `stripe:checkout:…` or `stripe:invoice:…`  
3. Never grant from client-side success redirects  

### GitHub tools fail
1. App installed and repos imported  
2. Installation linked to the same user  
3. Permissions: Contents read/write as needed  

## Logging

`src/lib/observability/logger.ts` emits JSON lines with redaction of secrets.  
Ship stdout to your log drain on Vercel or host.

## Data exposure

Admin pages show emails, balances, and error messages — not passwords or raw provider keys.  
Restrict `role = admin` to trusted operators only.
