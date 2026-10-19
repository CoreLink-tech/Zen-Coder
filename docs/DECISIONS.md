# Architectural Decisions — Zen-Coder

## ADR-001: Framework & Language

**Decision**: Next.js App Router + TypeScript + Tailwind CSS

**Rationale**: Official stack alignment with the master build prompt, excellent Vercel integration, strong TypeScript support, and mature App Router patterns for both UI and API routes.

## ADR-002: Authentication

**Decision**: Auth.js (formerly NextAuth)

**Rationale**: Confirmed by product owner. Maintained, flexible, works well with App Router and serverless environments. Database session strategy preferred once Drizzle is in place.

## ADR-003: Database

**Decision**: Turso (libSQL) + Drizzle ORM

**Rationale**: Specified in the build prompt. Edge-friendly, SQLite-compatible, strong migration story, and good TypeScript ergonomics with Drizzle.

## ADR-004: Hosting

**Decision**: Vercel for the web application

**Rationale**: Confirmed by product owner. Native Next.js support, previews, and environment management. Long-running workers will be evaluated separately in Phase 11.

## ADR-005: Payments

**Decision**: Deferred until after core product is functional

**Rationale**: Confirmed by product owner. Focus remains on Coding + Automation reliability first. Payment provider evaluation (Paystack / Flutterwave / Stripe) will occur in Phase 13.

## ADR-006: Product Name

**Decision**: Zen-Coder (temporary)

**Rationale**: Confirmed by product owner. Can be changed later with notification.

## ADR-007: GitHub Integration Approach

**Decision**: Prepare GitHub App integration code; product owner will register the App

**Rationale**: Confirmed by product owner. Least-privilege App is the preferred model over personal access tokens for multi-user production use.

## ADR-008: Authentication Library

**Decision**: Auth.js v5 (`next-auth@5.0.0-beta.32`) with Credentials provider and Drizzle adapter

**Rationale**: Confirmed by product owner in Phase 0. Database sessions align with our Turso/Drizzle stack. Credentials provider gives us email/password without external IdP dependency for the initial release.

**Note (2026)**: Auth.js v5 remains in long-term beta. Maintenance has moved to the Better Auth team. We may revisit migrating to Better Auth in a future hardening phase if stability or security concerns arise.
