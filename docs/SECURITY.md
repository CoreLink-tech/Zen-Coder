# Security — Zen-Coder

## Threat model (assumptions)

**We assume:**
- Transport is HTTPS in production
- `AUTH_SECRET`, Stripe, GitHub App private key, and AI keys remain server-only
- Admins are trusted operators
- Users may be adversarial toward other tenants and the platform

**Out of scope / residual risk:**
- Full multi-instance rate limiting (in-memory limiter is per process)
- Browser tool abuse against third-party sites if a user targets unauthorized systems (policy + public-URL checks mitigate SSRF to private nets)
- Supply-chain compromise of npm packages
- Prompt injection that tricks the model into proposing harmful repo changes (mitigated by **human approval** before GitHub writes)

## Authentication & sessions

- Auth.js v5, **JWT sessions** (required for Credentials provider), bcrypt cost 12
- Middleware + `requireUser()` / `requireAdmin()`
- Only `status === "active"` accounts sign in
- Role/status embedded in JWT on sign-in

## Tenant isolation

- All user data scoped by `user_id`
- GitHub installations and repos owned per user
- Tool execution receives `userId` in context; write tools resolve ownership before acting

## High-risk actions

| Action | Control |
|--------|---------|
| Repo file write | Propose → user approve → apply |
| Scheduled runs | Credit check + overlap prevention |
| Outbound webhook | Public URL only; HTTPS in production |
| Inbound webhook | Shared secret header |
| Stripe grants | Signature-verified webhooks + idempotent ledger |
| Admin pages | `role === admin` |

## Rate limits (Phase 15)

| Surface | Limit (default) |
|---------|-----------------|
| Coding messages | 30 / minute / user |
| Checkout | 10 / minute / user+IP |
| Inbound workflow webhook | 30 / minute / IP+workflow |

Implementation: `src/lib/security/rate-limit.ts` (in-memory). For horizontal scale, replace with Redis/Upstash.

## Input validation

- Zod on tool inputs and workflow definitions
- Message max length 20,000 characters
- Workflow steps capped; browser actions capped
- HTTP/browser URL policy blocks private/link-local/metadata hosts

## Secrets

- Never log API keys, passwords, webhook secrets (logger redacts known fields)
- Stripe webhook uses raw body + signature
- Cron endpoint requires `CRON_SECRET` in production

## Provider outages

- Agent engine catches provider errors and returns failed status without crashing the request
- Billing webhook returns 500 only on handler exceptions (Stripe retries)
- Health endpoint reports DB and integration configuration without exposing secrets

## Security headers

Middleware sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` on dashboard routes.

## Residual risks to accept or harden later

1. Distributed rate limit across many serverless instances  
2. Stricter CSP (currently allows unsafe-inline for Next/dev practicality)  
3. CAPTCHA on register if abuse appears  
4. Audit log table for admin actions  
5. Automatic credit clawback on refund (manual adjustment today)  
