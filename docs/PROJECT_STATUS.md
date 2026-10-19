# Project Status — Zen-Coder

## Current Phase

**Phase 6 — GitHub integration and repository context** (completed this session)

## Completed Work

### Phase 0–5
- App foundation, database, auth, AI providers, agent engine, Coding UI

### Phase 6
- GitHub App client (Octokit) with installation tokens
- github_installations table + repository linking
- Install + callback routes
- Settings UI: install App, import repos, disconnect
- Read-only agent tools: list_connected_repos, get_repo_info, list_repo_files, read_repo_file
- Ownership checks on all GitHub data access
- Write operations intentionally disabled
- docs/GITHUB.md

## Next Phase

**Phase 7 — Coding execution and code changes**

- Controlled file modification and patch generation
- Diff review
- Isolated test execution (when feasible)
- Commit / push / PR with explicit user approval

## Known Limitations

- GitHub App must be registered by the product owner (env vars required)
- No write access yet
- No webhook handling yet
- Large files are rejected (>200KB) for context safety

## Branch

- `main`
