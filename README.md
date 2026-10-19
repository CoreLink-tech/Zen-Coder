# Zen-Coder

AI Coding & Automation Platform.

One product with two primary workspaces that share a single account and credit balance:

- **Coding** — AI agent that understands repositories, writes and fixes code, runs tests, and works with GitHub.
- **Automation** — Real workflow engine for monitoring, browser automation, scheduled tasks, and integrations.

## Current Status

**Phase 1 complete** — Application foundation and interface.

See `docs/PROJECT_STATUS.md` for the detailed roadmap and progress.

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Turso / libSQL + Drizzle ORM (Phase 2)
- Auth.js (Phase 3)
- Multi-provider AI (DeepSeek, Claude, OpenAI) — Phase 4+
- Deploy target: Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build
```

Copy `.env.example` to `.env.local` and fill in values as they become required (none are mandatory for the Phase 1 UI).

## Project Structure (Phase 1)

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── coding/          # Coding workspace
│   │   ├── automation/      # Automation workspace
│   │   ├── settings/        # Shared settings
│   │   └── layout.tsx       # Shared shell (sidebar + main)
│   ├── layout.tsx
│   └── page.tsx             # Redirects to /coding
├── components/
│   ├── layout/              # Sidebar, Header
│   └── ui/                  # EmptyState, LoadingState, ErrorState, Button, Card
└── lib/                     # Shared utilities (expanding in later phases)
```

## Documentation

- `docs/PROJECT_STATUS.md` — Phase progress and next steps
- `docs/ARCHITECTURE.md` — High-level architecture
- `docs/DECISIONS.md` — Architectural decisions

## License

Private — CoreLink-tech
