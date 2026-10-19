# Billing & Subscriptions — Zen-Coder

## Principles

1. **Never trust the client** for payment success  
2. Credits are granted only from **verified Stripe webhooks**  
3. Every grant uses an **idempotent** `operationId` (`stripe:checkout:…` / `stripe:invoice:…`)  

## Plans

| Plan | Monthly credits | Stripe price env |
|------|-----------------|------------------|
| Free | 0 (welcome grant only) | — |
| Starter | 50,000 | `STRIPE_PRICE_STARTER` |
| Pro | 200,000 | `STRIPE_PRICE_PRO` |

## Credit packs

| Pack | Credits | Env |
|------|---------|-----|
| pack_10k | 10,000 | `STRIPE_PRICE_PACK_10K` |
| pack_50k | 50,000 | `STRIPE_PRICE_PACK_50K` |

## Endpoints

- `POST /api/billing/checkout` — authenticated; returns Checkout URL  
- `POST /api/billing/webhook` — Stripe signature verified; grants credits / updates subscription  

## Setup

1. Create products/prices in Stripe Dashboard  
2. Set env vars (secret key, webhook secret, price IDs, `NEXT_PUBLIC_APP_URL`)  
3. Webhook endpoint: `https://<domain>/api/billing/webhook`  
4. Events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`  

```bash
npm install
# stripe CLI for local:
# stripe listen --forward-to localhost:3000/api/billing/webhook
```

## Failure handling

- Invalid signature → 400, no ledger write  
- Missing metadata → event ignored, no grant  
- Duplicate event → `IdempotentReplayError` absorbed  
- Canceled / past_due → subscription status updated; no automatic clawback of already granted credits  
