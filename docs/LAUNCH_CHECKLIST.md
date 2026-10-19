# Launch Checklist — Zen-Coder

## Pre-launch

- [ ] `AUTH_SECRET` set and unique per environment  
- [ ] `NEXT_PUBLIC_APP_URL` / `AUTH_URL` match production domain  
- [ ] Turso database provisioned; `db:push` applied  
- [ ] At least one AI provider key configured  
- [ ] GitHub App created; callback URL correct; install tested  
- [ ] Stripe products/prices created; webhook verified with CLI or Dashboard  
- [ ] `CRON_SECRET` set; cron route returns 200 with auth  
- [ ] First user promoted to `admin`  
- [ ] `/api/health` returns `"status":"ok"`  

## Smoke — Auth

- [ ] Register new user  
- [ ] Login / logout  
- [ ] Welcome credits appear (5,000)  

## Smoke — Coding

- [ ] Create conversation; send message; receive assistant reply  
- [ ] Credits decrease after usage  
- [ ] Connect GitHub; import repo; `list_connected_repos` via agent  
- [ ] Propose file change; approve or reject in UI  

## Smoke — Automation

- [ ] Create workflow with `http_check` on a public URL  
- [ ] Run now; see succeeded steps  
- [ ] Save interval schedule; trigger `/api/cron/process-jobs`  
- [ ] Enable inbound webhook; POST with secret; job enqueued  

## Smoke — Billing (if Stripe enabled)

- [ ] Checkout session opens for Starter or pack  
- [ ] Test webhook grants credits exactly once (replay is idempotent)  

## Smoke — Admin

- [ ] `/admin` loads for admin; redirects for normal user  
- [ ] Users / usage / failures pages load  

## Go / no-go

**Go** if all required env vars work, smoke auth+coding pass, health is ok.  
**No-go** if DB unreachable, AUTH_SECRET missing, or no AI provider key.
