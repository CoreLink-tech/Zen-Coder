/**
 * AI module public API.
 *
 * Server-only — never import this into client components.
 */

export { chat, estimateCostUsd, estimateCredits, CREDITS_PER_USD } from "./chat";
export {
  MODEL_REGISTRY,
  DEFAULT_MODEL_ID,
  getModelInfo,
  listModelsForProvider,
} from "./models";
export {
  getProvider,
  listProviders,
  listConfiguredProviders,
  getProviderForModel,
} from "./providers";
export type {
  AiProvider,
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelInfo,
  ProviderId,
  TokenUsage,
  ToolDefinition,
} from "./types";
export { AiProviderError } from "./types";
