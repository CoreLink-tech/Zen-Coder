/**
 * Shared types for the multi-provider AI layer.
 */

export type ProviderId = "deepseek" | "anthropic" | "openai";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Optional tool call / tool result metadata */
  name?: string;
  toolCallId?: string;
  /** Assistant turn that requested tools (OpenAI-compatible) */
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  /** Provider-specific extras (e.g. thinking mode for DeepSeek) */
  extra?: Record<string, unknown>;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  /** Cached input tokens when the provider reports them */
  cachedInputTokens?: number;
  totalTokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  provider: ProviderId;
  model: string;
  content: string;
  finishReason: "stop" | "length" | "tool_calls" | "error" | "unknown";
  usage: TokenUsage;
  /** Raw tool calls if any */
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
  /** Wall-clock latency in ms */
  latencyMs: number;
}

export interface ProviderError {
  provider: ProviderId;
  code: string;
  message: string;
  /** HTTP status if available */
  status?: number;
  retryable: boolean;
}

export class AiProviderError extends Error {
  readonly provider: ProviderId;
  readonly code: string;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(err: ProviderError) {
    super(`[${err.provider}] ${err.message}`);
    this.name = "AiProviderError";
    this.provider = err.provider;
    this.code = err.code;
    this.status = err.status;
    this.retryable = err.retryable;
  }
}

export interface ModelInfo {
  id: string;
  provider: ProviderId;
  displayName: string;
  /** Approximate context window in tokens */
  contextWindow: number;
  /** Whether tool calling is supported */
  supportsTools: boolean;
  /** USD per 1M input tokens (approximate reference pricing) */
  inputPricePer1M?: number;
  /** USD per 1M output tokens */
  outputPricePer1M?: number;
}

/**
 * Common interface every provider adapter must implement.
 */
export interface AiProvider {
  readonly id: ProviderId;
  readonly displayName: string;

  /** List models this adapter knows about */
  listModels(): ModelInfo[];

  /** Whether the required API key is present */
  isConfigured(): boolean;

  /** Non-streaming chat completion */
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
}
