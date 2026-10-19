/**
 * OpenAI-compatible provider adapter.
 * Used for both OpenAI and DeepSeek (OpenAI-compatible base URL).
 */

import OpenAI from "openai";
import type {
  AiProvider,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelInfo,
  ProviderId,
} from "../types";
import { AiProviderError } from "../types";
import { listModelsForProvider } from "../models";

interface OpenAiCompatibleConfig {
  id: ProviderId;
  displayName: string;
  apiKeyEnv: string;
  baseURL?: string;
}

export function createOpenAiCompatibleProvider(
  config: OpenAiCompatibleConfig
): AiProvider {
  const { id, displayName, apiKeyEnv, baseURL } = config;

  function getClient(): OpenAI {
    const apiKey = process.env[apiKeyEnv];
    if (!apiKey) {
      throw new AiProviderError({
        provider: id,
        code: "missing_api_key",
        message: `${apiKeyEnv} is not set`,
        retryable: false,
      });
    }
    return new OpenAI({
      apiKey,
      baseURL: baseURL ?? undefined,
    });
  }

  return {
    id,
    displayName,

    listModels(): ModelInfo[] {
      return listModelsForProvider(id);
    },

    isConfigured(): boolean {
      return Boolean(process.env[apiKeyEnv]);
    },

    async chat(
      request: ChatCompletionRequest
    ): Promise<ChatCompletionResponse> {
      const start = Date.now();
      const client = getClient();

      try {
        const tools =
          request.tools && request.tools.length > 0
            ? request.tools.map((t) => ({
                type: "function" as const,
                function: {
                  name: t.name,
                  description: t.description,
                  parameters: t.parameters,
                },
              }))
            : undefined;

        const completion = await client.chat.completions.create({
          model: request.model,
          messages: request.messages.map((m) => {
            const base: Record<string, unknown> = {
              role: m.role as "system" | "user" | "assistant" | "tool",
              content: m.content,
            };
            if (m.name) base.name = m.name;
            if (m.toolCallId) base.tool_call_id = m.toolCallId;
            if (m.toolCalls && m.toolCalls.length > 0) {
              base.tool_calls = m.toolCalls.map((tc) => ({
                id: tc.id,
                type: "function",
                function: { name: tc.name, arguments: tc.arguments },
              }));
            }
            return base;
          }) as never,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          tools,
          ...request.extra,
        });

        const choice = completion.choices[0];
        const message = choice?.message;
        const usage = completion.usage;

        const toolCalls = message?.tool_calls?.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        }));

        const finishMap: Record<
          string,
          ChatCompletionResponse["finishReason"]
        > = {
          stop: "stop",
          length: "length",
          tool_calls: "tool_calls",
        };

        return {
          id: completion.id,
          provider: id,
          model: completion.model,
          content: message?.content ?? "",
          finishReason: finishMap[choice?.finish_reason ?? ""] ?? "unknown",
          usage: {
            inputTokens: usage?.prompt_tokens ?? 0,
            outputTokens: usage?.completion_tokens ?? 0,
            cachedInputTokens:
              (usage as { prompt_tokens_details?: { cached_tokens?: number } })
                ?.prompt_tokens_details?.cached_tokens,
            totalTokens: usage?.total_tokens ?? 0,
          },
          toolCalls,
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        if (err instanceof AiProviderError) throw err;

        const anyErr = err as {
          status?: number;
          code?: string;
          message?: string;
        };
        const status = anyErr.status;
        const retryable = status === 429 || (status !== undefined && status >= 500);

        throw new AiProviderError({
          provider: id,
          code: anyErr.code ?? "provider_error",
          message: anyErr.message ?? "Unknown provider error",
          status,
          retryable,
        });
      }
    },
  };
}
