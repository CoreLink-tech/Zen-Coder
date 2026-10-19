# Automation Engine — Zen-Coder

## Status

- **Phase 9**: Workflow definitions, validation, on-demand execution
- **Phase 10**: Enhanced HTTP/API checks + Playwright browser automation

Scheduling / durable workers: Phase 11.

## Automation tools

| Tool | Description |
|------|-------------|
| `http_check` | GET/HEAD/POST status + latency + body preview |
| `http_json_assert` | JSON fetch + optional path/value assertion |
| `browser_run` | Headless Chromium actions (goto, click, fill, wait, get_text, screenshot) |
| `log_message` | Deterministic log entry |

## URL policy

All HTTP and browser navigation must target **public** `http`/`https` URLs.  
Localhost, RFC1918, link-local, and metadata hosts are blocked.

## Browser setup

```bash
npm install
npm run playwright:install   # downloads Chromium
```

If Playwright or Chromium is missing, `browser_run` returns a clear error instead of crashing.

## Browser limits

- Max 15 actions per run  
- Max ~60s total session time  
- Default action timeout 15s  
- Screenshot payload capped  

Process-level isolation and worker queues are planned for Phase 11.

## Definition example (browser)

```json
{
  "version": 1,
  "steps": [
    {
      "id": "b1",
      "name": "Open example.com",
      "toolId": "browser_run",
      "input": {
        "actions": [
          { "type": "goto", "url": "https://example.com" },
          { "type": "get_text", "selector": "h1" }
        ]
      },
      "onFailure": "abort"
    }
  ]
}
```
