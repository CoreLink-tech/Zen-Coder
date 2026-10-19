/**
 * High-level chat entry point used by Coding and Automation agents.
 *
 * - Resolves model → provider
 * - Validates configuration
 * - Returns normalized response + usage
 * - Never exposes API keys to the client
 */

import { DEFAULT_MODEL_ID, getModelInfo } from "./models";
import { getProviderForModel } from "./providers";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  ToolDefinition,
} from "./types";
import { AiProviderError } from "./types";

export interface ChatOptions {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  extra?: Record<string, unknown>;
}

/**
 * Estimate USD cost from usage and model pricing (reference only).
 * Real billing uses provider-reported figures when available.
 */
export function estimateCostUsd(
  modelId: string,
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens?: number }
): number | null {
  const info = getModelInfo(modelId);
  if (!info?.inputPricePer1M || !info?.outputPricePer1M) return null;

  const cached = usage.cachedInputTokens ?? 0;
  const uncachedInput = Math.max(0, usage.inputTokens - cached);
  // Assume cached tokens are ~10% of input price when not separately priced
  const inputCost =
    (uncachedInput / 1_000_000) * info.inputPricePer1M +
    (cached / 1_000_000) * info.inputPricePer1M * 0.1;
  const outputCost = (usage.outputTokens / 1_000_000) * info.outputPricePer1M;
  return inputCost + outputCost;
}

/**
 * Reference conversion: 1000 internal credits = $1.00 provider cost.
 * Configurable later via billing settings (Phase 8).
 */
export const CREDITS_PER_USD = 1000;

export function estimateCredits(
  modelId: string,
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens?: number }
): number | null {
  const usd = estimateCostUsd(modelId, usage);
  if (usd === null) return null;
  return Math.ceil(usd * CREDITS_PER_USD);
}

export async function chat(
  options: ChatOptions
): Promise<ChatCompletionResponse> {
  const modelId = options.model ?? DEFAULT_MODEL_ID;
  const modelInfo = getModelInfo(modelId);

  if (!modelInfo) {
    throw new AiProviderError({
      provider: "openai", // fallback id for unknown model
      code: "unknown_model",
      message: `Unknown model: ${modelId}`,
      retryable: false,
    });
  }

  const provider = getProviderForModel(modelId);
  if (!provider) {
    throw new AiProviderError({
      provider: modelInfo.provider,
      code: "no_provider",
      message: `No provider registered for model: ${modelId}`,
      retryable: false,
    });
  }

  if (!provider.isConfigured()) {
    throw new AiProviderError({
      provider: provider.id,
      code: "missing_api_key",
      message: `${provider.displayName} is not configured (missing API key)`,
      retryable: false,
    });
  }

  const request: ChatCompletionRequest = {
    model: modelId,
    messages: options.messages,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    tools: options.tools,
    extra: options.extra,
  };

  return provider.chat(request);
}
