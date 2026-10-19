# GitHub Integration — Zen-Coder

## Status (Phase 6)

Read-only GitHub App integration is implemented. Write operations (edit, commit, push, PR) are deferred to Phase 7.

## Setup (product owner)

1. Create a **GitHub App** at https://github.com/settings/apps/new
2. Permissions (Repository):
   - **Contents**: Read-only
   - **Metadata**: Read-only
3. Callback URL: `https://<your-domain>/api/github/callback`
4. Setup URL (optional): same as callback
5. Webhook: optional for Phase 6; secret can be set for later
6. Generate a private key and download it
7. Note the App ID, Client ID, Client Secret, and URL slug

Environment variables:

```env
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=   # PEM content; use \n for newlines in env
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_APP_WEBHOOK_SECRET=  # optional for now
GITHUB_APP_SLUG=            # from github.com/apps/<slug>
```

## User flow

1. User opens **Settings → GitHub Integration**
2. Clicks **Install GitHub App** → redirected to GitHub
3. Installs the App on their account or org (select repos)
4. GitHub redirects to `/api/github/callback?installation_id=...`
5. Installation is linked to the Zen-Coder user
6. User clicks **Import repos** to sync accessible repositories
7. Coding agent can use read-only tools against connected repos

## Agent tools (read-only)

| Tool | Description |
|------|-------------|
| `list_connected_repos` | Repos linked to the user |
| `get_repo_info` | Default branch, language, visibility |
| `list_repo_files` | Directory listing at a path |
| `read_repo_file` | File contents (max ~200KB) |

All tools enforce ownership: the installation and repository must belong to the requesting user.

## Security

- Installation tokens are obtained server-side via the GitHub App private key
- No user personal access tokens are stored
- Cross-user isolation: queries filter by `user_id`
- Write scopes are not requested in Phase 6

## Phase 7 (next)

- Controlled file modification / patch generation
- Diff review UI
- Commit and push with explicit user approval
- Pull request creation
