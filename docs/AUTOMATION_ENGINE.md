# Automation Engine — Zen-Coder

## Status

- **Phase 9**: Workflow definitions, validation, on-demand execution
- **Phase 10**: HTTP/API checks + Playwright browser automation
- **Phase 11**: Schedules, background jobs, cron processor, credit checks

## Tools

| Tool | Description |
|------|-------------|
| `http_check` | GET/HEAD/POST status + latency |
| `http_json_assert` | JSON path/value assertions |
| `browser_run` | Headless Chromium actions |
| `log_message` | Deterministic log |

## Scheduling

- **Interval**: expression = minutes (e.g. `15`)
- **Cron**: 5-field UTC (`m h dom mon dow`), supports `*` and `*/n`

Tables:

- `workflow_schedules` — schedule definition + `nextRunAt`
- `background_jobs` — durable queue with retries

### Cron endpoint

`GET/POST /api/cron/process-jobs`

1. Enqueues due schedules
2. Claims and runs pending jobs
3. Advances schedule + re-enqueues next run
4. Charges shared credits (`usage:job:<jobId>`)

Protect with `CRON_SECRET` (Bearer or `?secret=`).
`vercel.json` schedules this path every minute.

### Overlap prevention

When `preventOverlap` is true, a new scheduled run is skipped if an execution is already `running` for that workflow.

### Credits

Scheduled runs deduct a flat **10 credits** (v1) when available; otherwise the job fails with an insufficient-credits error.

## Browser setup

```bash
npm install
npm run playwright:install
```
