# GitHub Integration — Zen-Coder

## Status

- **Phase 6**: Read-only access (list/read files)
- **Phase 7**: Controlled writes via **proposed changes** + explicit user approval

The agent never writes directly to GitHub. It calls `propose_file_changes`, which stores a pending proposal. The user reviews the diff and chooses **Commit**, **Commit + open PR**, or **Reject**.

## Setup (product owner)

1. Create a **GitHub App** at https://github.com/settings/apps/new
2. Permissions (Repository):
   - **Contents**: Read and write
   - **Metadata**: Read-only
   - **Pull requests**: Read and write (for PR creation)
3. Callback URL: `https://<your-domain>/api/github/callback`
4. Setup URL (optional): same as callback
5. Generate a private key
6. Note App ID, Client ID, Client Secret, URL slug

```env
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_APP_WEBHOOK_SECRET=  # optional
GITHUB_APP_SLUG=
```

## User flow

1. Settings → Install GitHub App → select repos
2. Import repos
3. In Coding chat, ask the agent to change a file
4. Agent calls `propose_file_changes` → pending proposal appears
5. User reviews content and clicks **Commit** or **Commit + open PR**

## Agent tools

| Tool | Access | Description |
|------|--------|-------------|
| `list_connected_repos` | Read | Linked repos |
| `get_repo_info` | Read | Metadata |
| `list_repo_files` | Read | Directory listing |
| `read_repo_file` | Read | File contents (≤200KB) |
| `propose_file_changes` | Write (gated) | Creates pending proposal only |

## Security

- Installation tokens only; no user PATs stored
- All queries scoped by `user_id`
- Writes require an existing pending proposal owned by the user
- Multi-file changes are applied as sequential Contents API commits (auditable per file)

## Limitations

- Isolated test runners are not implemented yet (no sandbox workers)
- True single multi-file git commit (Git Data API tree) can be added later
- Webhooks not handled yet
