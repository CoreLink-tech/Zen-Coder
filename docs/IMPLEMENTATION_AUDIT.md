# Implementation Audit — Zen-Coder

**Date:** 2026-10-21  
**Repo:** https://github.com/CoreLink-tech/Zen-Coder  
**Production:** https://zen-coder.vercel.app  
**Baseline commit:** `af40653` (main)  
**Audit method:** Static code inspection of `src/app`, `src/lib`, `src/components`, docs, `vercel.json`, `.env.example`. No destructive DB operations.

---

## Executive summary

Zen-Coder is a **partially connected product**. Auth, shared credit ledger, coding chat shell, automation CRUD/executor skeleton, Stripe/GitHub code paths, and Vercel deploy exist. Several product requirements from the repair brief are **missing** (System Architect, Multi-Model Debugger). Docs claim phases 0–16 “complete”; evidence shows many journeys are **implemented but unverified** or **blocked by configuration** (AI keys, GitHub App, Stripe prices, CRON_SECRET).

**Do not treat a green Vercel build as product completeness.**

---

## Classification legend

| Label | Meaning |
|-------|---------|
| **Verified** | Code path exists and has been exercised in production-like conditions |
| **Implemented** | Code exists; not fully verified end-to-end in this audit |
| **Partial** | Core pieces exist; gaps prevent full journey |
| **UI only** | Renders; no real backend effect |
| **Missing** | Required by product brief; not present |
| **Blocked** | Depends on missing env / external service |

---

## Route inventory

| Route | File | Auth | Data source | Actions connected | Status |
|-------|------|------|-------------|-------------------|--------|
| `/` | `src/app/page.tsx` | N/A | redirect → `/coding` | redirect | **Implemented** |
| `/login` | `(auth)/login/page.tsx` | public | Auth.js credentials | `loginAction` | **Verified** (prod register/login works) |
| `/register` | `(auth)/register/page.tsx` | public | DB + credits welcome grant | `registerAction` | **Verified** |
| `/coding` | `(dashboard)/coding/page.tsx` | middleware + `requireUser` | `listCodingConversations` | New chat, send message | **Partial** (chat works; agent needs AI keys) |
| `/coding/[id]` | `coding/[id]/page.tsx` | yes | conversation + messages + proposals | chat, approve/reject changes | **Partial** |
| `/automation` | `automation/page.tsx` | yes | `listAutomationWorkflows` | list / new | **Partial** |
| `/automation/new` | `automation/new/page.tsx` | yes | create workflow form | create | **Partial** |
| `/automation/[id]` | `automation/[id]/page.tsx` | yes | workflow + versions + executions | run, schedule, webhook | **Partial** |
| `/settings` | `settings/page.tsx` | yes | credits, ledger, GitHub status, Stripe plans | checkout buttons | **Partial** |
| `/admin` | `admin/page.tsx` | `requireAdmin` | admin queries | links | **Partial** (admin role only) |
| `/admin/users` | `admin/users/page.tsx` | admin | user list | read-only | **Partial** |
| `/admin/usage` | `admin/usage/page.tsx` | admin | usage overview | read-only | **Partial** |
| `/admin/failures` | `admin/failures/page.tsx` | admin | failed tasks/execs | read-only | **Partial** |
| System Architect UI | — | — | — | — | **Missing** |
| Multi-Model Debugger UI | — | — | — | — | **Missing** |
| Dedicated billing portal page | — | — | Stripe via settings | — | **Partial** (embedded in settings) |

### API routes

| Route | Purpose | Auth | Status |
|-------|---------|------|--------|
| `/api/auth/[...nextauth]` | Auth.js | public handlers | **Implemented** |
| `/api/health` | Health + DB ping | public | **Verified** |
| `/api/ai/providers` | List configured providers | session? | **Implemented** |
| `/api/billing/checkout` | Stripe Checkout | user | **Blocked** without Stripe prices |
| `/api/billing/webhook` | Stripe webhooks | signature | **Implemented** (needs live webhook URL) |
| `/api/cron/process-jobs` | Daily job processor | `CRON_SECRET` | **Partial** (Hobby: 1×/day) |
| `/api/github/install` | GitHub App install redirect | user | **Blocked** without App config |
| `/api/github/callback` | OAuth callback | — | **Blocked** without App config |
| `/api/webhooks/workflows/[id]` | Inbound workflow webhook | secret | **Partial** |

---

## Feature audit (product brief mapping)

### 1. Auth + navigation
- **JWT Auth.js + credentials**, bcrypt, register/login/logout: **Verified**
- Dashboard middleware protects `/coding`, `/automation`, `/settings`, `/admin`
- Mobile drawer nav: **Implemented** (af40653)
- Suspended users: redirected on `requireUser` status check: **Implemented**
- No dedicated 401/403 pages: **Partial**

### 2. Coding workspace
- Conversations + messages persisted: **Implemented**
- ReAct agent + tool registry: **Implemented**
- Credit pre-check + `deductUsage` per task: **Implemented**
- GitHub read/write tools: **Implemented** in code
- Proposed changes approve/reject/apply: **Implemented** in code
- Model picker in UI: **Missing / weak** (optional `model` arg only)
- Real repo tree UX: **Partial** (tools, not full file browser UI)
- Isolated test runner: **Missing** (no secure sandbox; must not claim tests passed)
- **Blocked:** AI provider keys on Vercel; GitHub App credentials

### 3. Automation workspace
- Workflow CRUD + versioning + executor: **Implemented**
- HTTP / browser / log tools: **Implemented**
- Schedules + background jobs + cron: **Partial** (daily cron only on Hobby)
- Execution history UI: **Partial**
- **Blocked:** Playwright browsers on Vercel serverless (browser tool soft-fails)

### 4. System Architect
- **Missing** — no module, schema table for plans, or approval gate before implementation

### 5. Multi-Model Debugger
- **Missing** — no post-completion opt-in, no multi-provider review, no persisted findings

### 6. Shared credit wallet
- Single `credit_accounts` + `credit_ledger_entries`: **Implemented**
- Idempotent `operationId`: **Implemented**
- Welcome grant on register: **Implemented**
- Concurrent overspend protection: **Partial** (conditional SQL update present)
- Client cannot set balance: **Verified** (server-only ledger)
- Debugger not wired to wallet: N/A until debugger exists

### 7. GitHub
- App config detection, install URL, Octokit helpers: **Implemented**
- **Blocked** until `GITHUB_APP_*` env set

### 8. Billing / admin
- Stripe checkout + webhook handlers: **Implemented**
- Plans UI in settings: **Implemented**
- Admin overview: **Partial**
- **Blocked:** Stripe price IDs / webhook endpoint configuration

### 9. Security
- Rate limit on coding send: **Implemented**
- URL policy for HTTP/browser (SSRF mitigations): **Implemented**
- Secrets not in client bundles: **Implemented** pattern
- `typescript.ignoreBuildErrors` / `eslint.ignoreDuringBuilds`: **Risk** (masks defects)

### 10. Tests
- No unit/integration/e2e test suite in `package.json` scripts beyond lint/typecheck: **Missing**

---

## Documentation vs reality

| Doc claim | Reality |
|-----------|---------|
| PROJECT_STATUS: phases 0–16 complete | Scaffold + partial journeys; Architect/Debugger absent |
| Launch checklist | Not re-run as formal suite in this audit |
| README quick start | Reasonable for local; production needs full env matrix |

---

## Prioritized defect list

### P0 — Blocks core product value
1. No AI provider keys in production → coding agent fails or empty  
2. System Architect missing (required approval gate)  
3. Multi-Model Debugger missing (post-completion only)  
4. Typecheck/eslint ignored in production builds  

### P1 — Broken or incomplete journeys
5. GitHub App not configured → install/apply changes blocked  
6. Stripe price env incomplete → checkout may 503  
7. Schema drift risk (manual Turso tables vs Drizzle schema)  
8. Cron only once daily on Hobby → delayed schedules  

### P2 — UX / reliability
9. Weak model selection UX  
10. No automated tests  
11. Admin only useful with `role=admin`  
12. Browser automation not viable on pure Vercel serverless  

---

## External configuration required

| Variable | Needed for |
|----------|------------|
| `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL` | Auth (set) |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | DB (set) |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `DEEPSEEK_API_KEY` | Coding/Automation AI |
| `GITHUB_APP_*` | Repo access / writes |
| `STRIPE_*` + price IDs | Billing |
| `CRON_SECRET` | Job processor auth |

---

## Stage plan (from brief)

| Stage | Focus | Status after this audit |
|-------|--------|-------------------------|
| A | Audit + baseline | **This document** |
| B | Connectivity | Next |
| C | Coding workflow | Next |
| D | System Architect | **Implement next** |
| E | Credits | Verify while implementing |
| F | Automation | Hardening |
| G | Multi-Model Debugger | After Architect + coding completion hook |
| H | Settings/billing/admin | Config + polish |
| I | Security + prod | Typecheck, smoke, docs |

---

## Baseline commands (not all executed in sandbox)

- `npm run build` — historically passes with ignoreBuildErrors  
- `npm run typecheck` — expected to report errors (ignored in CI/Vercel)  
- Production `/api/health` — previously returned `database: up`  

