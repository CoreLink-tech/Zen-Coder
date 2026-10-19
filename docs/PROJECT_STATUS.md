# Project Status — Zen-Coder

## Current Phase

**Phase 7 — Coding execution and code changes** (completed this session)

## Completed Work

### Phase 0–6
- Foundation, DB, auth, AI providers, agent engine, Coding UI, GitHub read-only

### Phase 7
- proposed_changes table for approval-gated writes
- propose_file_changes tool (agent proposes; never writes directly)
- Apply / reject / open-PR server actions
- GitHub write helpers: create/update/delete file, branch, PR
- Pending changes review UI in Coding conversations
- docs/GITHUB.md updated for write permissions

## Next Phase

**Phase 8 — Unified credit ledger**

- Shared credit account mutations with concurrency protection
- Record AI usage against the ledger
- Reservations and reconciliation

## Known Limitations

- No isolated test execution workers yet
- Multi-file changes = sequential Contents API commits (not one git tree commit)
- GitHub App needs Contents: write + Pull requests: write
- Live apply requires configured App + imported repos

## Branch

- `main`
