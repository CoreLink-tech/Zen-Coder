# Credits & Billing — Zen-Coder

## Single shared balance

Coding, Automation, and future AI workspaces all draw from **one** credit account per user.

- `balance` — total credits owned  
- `reserved` — held for in-flight work  
- **available** = balance − reserved  

Negative balances are not allowed by default.

## Conversion (v1)

| Rule | Value |
|------|--------|
| Credits per $1.00 provider cost | 1,000 |
| Welcome grant (new accounts) | 5,000 credits |

Configured in `src/lib/credits/config.ts` (`CREDIT_CONFIG.version = "v1"`).

## Ledger entry types

| Type | Effect on balance | Notes |
|------|-------------------|--------|
| `grant` | + | Welcome, promo, admin |
| `purchase` | + | Paid top-ups (Phase 13) |
| `usage` | − | AI provider usage |
| `refund` | + | Reversals |
| `adjustment` | ± | Admin |
| `reservation` | reserved ↑ | Hold without debiting balance |
| `release` | reserved ↓ | Free unused hold |
| `reconciliation` | ± | Estimate vs actual |

Every entry has a unique **`operationId`** for idempotency. Replaying the same operation does not double-charge.

## API (`src/lib/credits`)

- `grantCredits` / `recordPurchase` / `deductUsage` / `refundCredits`
- `reserveCredits` / `releaseReservation`
- `ensureWelcomeGrant` (idempotent per user)
- `getAccountSummary` / `listLedgerEntries`

## Integration points

- **Registration** → welcome grant  
- **Coding agent run** → `deductUsage` with `operationId = usage:task:<taskId>`  
- **UI** → sidebar available balance; Settings shows ledger history  

Automation usage will use the same `deductUsage` path with `workflowExecutionId` (Phase 9+).

## Phase 13

Paid plans and payment webhooks will call `recordPurchase` after verified payment. Never trust client-side “payment success” alone.
