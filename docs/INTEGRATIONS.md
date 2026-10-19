# Automation Integrations — Zen-Coder

## Tools (Phase 12)

| Tool | Risk | Notes |
|------|------|--------|
| `notify_webhook` | High | Outbound POST JSON to **public** URL; HTTPS required in production |
| `http_latency_budget` | Medium | Assert response time ≤ maxMs |
| `http_multi_check` | Medium | Up to 10 public URLs; fails if any fail |
| `http_check` | Medium | Single endpoint status |
| `http_json_assert` | Medium | JSON path assertions |
| `browser_run` | High | Headless browser; action limits |
| `log_message` | Low | No side effects |

## Operational risks

### Outbound webhooks (`notify_webhook`)
- Can send data to third parties — only use endpoints you control
- Private IPs blocked (SSRF mitigation)
- Payload size limited; no retry storm (single attempt per step)

### Inbound workflow webhooks
- `POST /api/webhooks/workflows/:id` with `X-Zen-Webhook-Secret`
- Secret stored on the workflow; rotate from the UI
- Enqueues a job (async); does not run the workflow inline
- Disable webhook by clearing the secret

### HTTP monitors
- Only public http(s) targets
- Timeouts and concurrency limited per step
- Do not point at systems you are not authorized to test

## Permissions

Tool definitions include a `permissions` array (e.g. `automation:notify`).  
Enforcement is stubbed to allow empty permissions; expand with role checks as the admin model matures (Phase 14).
