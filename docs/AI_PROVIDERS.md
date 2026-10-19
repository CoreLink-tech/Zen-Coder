# AI Providers — Zen-Coder

## Overview

A common provider abstraction backs both Coding and Automation.

| Provider   | SDK                         | Env var             | Default models                          |
|------------|-----------------------------|---------------------|-----------------------------------------|
| DeepSeek   | OpenAI-compatible (`openai`) | `DEEPSEEK_API_KEY`  | `deepseek-flash`, `deepseek-v4-pro`     |
| Anthropic  | `@anthropic-ai/sdk`         | `ANTHROPIC_API_KEY` | `claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5` |
| OpenAI     | `openai`                    | `OPENAI_API_KEY`    | `gpt-6-luna`, `gpt-6-sol`, `gpt-4.1`, `gpt-4o`, `gpt-4o-mini` |

Default model when none is specified: **`deepseek-flash`**.

## Architecture

```
src/lib/ai/
├── types.ts              # Shared interfaces & AiProviderError
├── models.ts             # Model registry (IDs, context, reference pricing)
├── chat.ts               # High-level chat() + cost/credit estimates
├── index.ts              # Public exports
└── providers/
    ├── index.ts          # Registry / factory
    ├── openai-compatible.ts  # OpenAI + DeepSeek
    └── anthropic.ts      # Claude
```

- Keys stay on the server. Never sent to the browser.
- Missing keys produce a clear `AiProviderError` with `code: "missing_api_key"`.
- Responses are normalized: content, finish reason, token usage, latency, tool calls.
- Reference pricing is used only for estimates; Phase 8 will reconcile against real ledger entries.

## Usage (server-only)

```ts
import { chat, estimateCredits } from "@/lib/ai";

const response = await chat({
  model: "claude-sonnet-5-5",
  messages: [
    { role: "system", content: "You are a coding assistant." },
    { role: "user", content: "Explain this function…" },
  ],
  maxTokens: 2048,
});

const credits = estimateCredits(response.model, response.usage);
```

## API

`GET /api/ai/providers` (authenticated) returns configured providers and their models without exposing keys.

## Adding a provider

1. Implement `AiProvider` in `src/lib/ai/providers/`.
2. Register it in `providers/index.ts`.
3. Add models to `MODEL_REGISTRY`.
4. Document the env var in `.env.example`.

## Notes

- Model IDs and reference prices were verified against public provider docs (Oct 2026).
- Provider pricing changes do not require rewriting the agent engine — only the registry.
- Streaming is not implemented in Phase 4; it will be added when the Coding agent UI needs it (Phase 5).
