# Automation Engine — Zen-Coder

## Phase 9 status

Foundation is in place:

- Versioned workflow definitions (JSON schema v1)
- Validation before save
- On-demand execution via shared tool registry
- Step-level logs stored on `workflow_executions`
- UI: list, create, detail, run, pause/activate, delete

Scheduling and background workers arrive in Phase 11. Browser automation in Phase 10.

## Definition format

```json
{
  "version": 1,
  "steps": [
    {
      "id": "step-1",
      "name": "Check site",
      "toolId": "http_check",
      "input": {
        "url": "https://example.com",
        "method": "GET",
        "expectedStatus": 200
      },
      "onFailure": "abort"
    }
  ]
}
```

## Automation tools (Phase 9)

| Tool | Description |
|------|-------------|
| `http_check` | HTTP GET/HEAD status + latency (blocks private IPs) |
| `log_message` | Deterministic log entry |

## Execution

`executeWorkflowDefinition` runs steps in order. On failure:

- `onFailure: "abort"` stops the workflow  
- `onFailure: "continue"` records the failure and continues  

Executions are recorded with status, timestamps, and JSON step logs.

## Security

- Only tools registered for the `automation` workspace can be used in definitions
- Private/local network targets blocked in `http_check`
- All workflows and executions are user-scoped
