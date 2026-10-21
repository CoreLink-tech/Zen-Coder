# Project Status — Zen-Coder

**Last updated:** 2026-10-21  
**Source of truth for implementation fidelity:** `docs/IMPLEMENTATION_AUDIT.md`

## Reality (evidence-based)

| Area | Status |
|------|--------|
| Auth (register/login/session) | Complete and verified in production |
| Shared credit ledger | Implemented; welcome grant + usage deduct |
| Coding chat + agent engine | Partial — needs AI provider keys; Architect gate added |
| System Architect | Implemented (pending_approval gate) — needs AI keys to generate |
| Multi-Model Debugger | Implemented (post-completion opt-in) — needs AI keys |
| Automation workflows | Partial — executor exists; browser limited on serverless |
| GitHub App integration | Implemented in code; **blocked** without App credentials |
| Stripe billing | Implemented in code; **blocked** without price IDs / webhook |
| Admin | Partial — requires `role=admin` |
| Automated tests | Not implemented |
| Production build | Passes with TS/ESLint ignored (technical debt) |

## Branch

- `main` (deployed to Vercel)

## Required configuration for full journeys

See `.env.example` and `docs/IMPLEMENTATION_AUDIT.md` § External configuration.
