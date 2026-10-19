/**
 * Configurable model registry.
 * IDs verified against provider docs as of Oct 2026.
 * Pricing is approximate reference only — real cost comes from provider usage.
 */

import type { ModelInfo, ProviderId } from "./types";

export const MODEL_REGISTRY: ModelInfo[] = [
  // DeepSeek
  {
    id: "deepseek-flash",
    provider: "deepseek",
    displayName: "DeepSeek Flash",
    contextWindow: 1_000_000,
    supportsTools: true,
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.6,
  },
  {
    id: "deepseek-v4-pro",
    provider: "deepseek",
    displayName: "DeepSeek V4 Pro",
    contextWindow: 1_000_000,
    supportsTools: true,
    inputPricePer1M: 0.66,
    outputPricePer1M: 1.98,
  },

  // Anthropic Claude
  {
    id: "claude-haiku-5-5",
    provider: "anthropic",
    displayName: "Claude Haiku 5.5",
    contextWindow: 1_000_000,
    supportsTools: true,
    inputPricePer1M: 0.1,
    outputPricePer1M: 0.5,
  },
  {
    id: "claude-sonnet-5-5",
    provider: "anthropic",
    displayName: "Claude Sonnet 5.5",
    contextWindow: 1_000_000,
    supportsTools: true,
    inputPricePer1M: 2.0,
    outputPricePer1M: 10.0,
  },
  {
    id: "claude-opus-5-5",
    provider: "anthropic",
    displayName: "Claude Opus 5.5",
    contextWindow: 1_000_000,
    supportsTools: true,
    inputPricePer1M: 4.0,
    outputPricePer1M: 20.0,
  },

  // OpenAI
  {
    id: "gpt-6-luna",
    provider: "openai",
    displayName: "GPT-6 Luna",
    contextWindow: 1_100_000,
    supportsTools: true,
    inputPricePer1M: 0.1,
    outputPricePer1M: 0.5,
  },
  {
    id: "gpt-6-sol",
    provider: "openai",
    displayName: "GPT-6 Sol",
    contextWindow: 1_100_000,
    supportsTools: true,
    inputPricePer1M: 2.0,
    outputPricePer1M: 10.0,
  },
  {
    id: "gpt-4.1",
    provider: "openai",
    displayName: "GPT-4.1",
    contextWindow: 1_000_000,
    supportsTools: true,
    inputPricePer1M: 2.0,
    outputPricePer1M: 8.0,
  },
  {
    id: "gpt-4o",
    provider: "openai",
    displayName: "GPT-4o",
    contextWindow: 128_000,
    supportsTools: true,
    inputPricePer1M: 2.5,
    outputPricePer1M: 10.0,
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    displayName: "GPT-4o Mini",
    contextWindow: 128_000,
    supportsTools: true,
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.6,
  },
];

export function getModelInfo(modelId: string): ModelInfo | undefined {
  return MODEL_REGISTRY.find((m) => m.id === modelId);
}

export function listModelsForProvider(provider: ProviderId): ModelInfo[] {
  return MODEL_REGISTRY.filter((m) => m.provider === provider);
}

/** Default model used when none is specified */
export const DEFAULT_MODEL_ID = "deepseek-flash";
