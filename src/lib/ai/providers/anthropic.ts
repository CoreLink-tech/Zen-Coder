/**
 * Anthropic Claude provider adapter.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  AiProvider,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelInfo,
} from "../types";
import { AiProviderError } from "../types";
import { listModelsForProvider } from "../models";

export function createAnthropicProvider(): AiProvider {
  const id = "anthropic" as const;

  function getClient(): Anthropic {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AiProviderError({
        provider: id,
        code: "missing_api_key",
        message: "ANTHROPIC_API_KEY is not set",
        retryable: false,
      });
    }
    return new Anthropic({ apiKey });
  }

  return {
    id,
    displayName: "Anthropic",

    listModels(): ModelInfo[] {
      return listModelsForProvider(id);
    },

    isConfigured(): boolean {
      return Boolean(process.env.ANTHROPIC_API_KEY);
    },

    async chat(
      request: ChatCompletionRequest
    ): Promise<ChatCompletionResponse> {
      const start = Date.now();
      const client = getClient();

      try {
        // Anthropic separates system messages
        const systemParts = request.messages
          .filter((m) => m.role === "system")
          .map((m) => m.content);
        const system = systemParts.length > 0 ? systemParts.join("\n\n") : undefined;

        const messages = request.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: (m.role === "assistant" ? "assistant" : "user") as
              | "user"
              | "assistant",
            content: m.content,
          }));

        const tools =
          request.tools && request.tools.length > 0
            ? request.tools.map((t) => ({
                name: t.name,
                description: t.description,
                input_schema: t.parameters as Anthropic.Tool["input_schema"],
              }))
            : undefined;

        const response = await client.messages.create({
          model: request.model,
          max_tokens: request.maxTokens ?? 4096,
          temperature: request.temperature,
          system,
          messages,
          tools,
          ...request.extra,
        });

        const textBlocks = response.content.filter(
          (b): b is Anthropic.TextBlock => b.type === "text"
        );
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
        );

        const finishMap: Record<
          string,
          ChatCompletionResponse["finishReason"]
        > = {
          end_turn: "stop",
          max_tokens: "length",
          tool_use: "tool_calls",
        };

        return {
          id: response.id,
          provider: id,
          model: response.model,
          content: textBlocks.map((b) => b.text).join(""),
          finishReason: finishMap[response.stop_reason ?? ""] ?? "unknown",
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            cachedInputTokens: (
              response.usage as { cache_read_input_tokens?: number }
            ).cache_read_input_tokens,
            totalTokens:
              response.usage.input_tokens + response.usage.output_tokens,
          },
          toolCalls: toolUseBlocks.map((b) => ({
            id: b.id,
            name: b.name,
            arguments: JSON.stringify(b.input),
          })),
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        if (err instanceof AiProviderError) throw err;

        const anyErr = err as {
          status?: number;
          error?: { type?: string; message?: string };
          message?: string;
        };
        const status = anyErr.status;
        const retryable = status === 429 || (status !== undefined && status >= 500);

        throw new AiProviderError({
          provider: id,
          code: anyErr.error?.type ?? "provider_error",
          message:
            anyErr.error?.message ?? anyErr.message ?? "Unknown provider error",
          status,
          retryable,
        });
      }
    },
  };
}
