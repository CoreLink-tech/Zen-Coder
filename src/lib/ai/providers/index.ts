/**
 * Provider registry and factory.
 */

import type { AiProvider, ProviderId } from "../types";
import { createOpenAiCompatibleProvider } from "./openai-compatible";
import { createAnthropicProvider } from "./anthropic";

const providers: Record<ProviderId, AiProvider> = {
  openai: createOpenAiCompatibleProvider({
    id: "openai",
    displayName: "OpenAI",
    apiKeyEnv: "OPENAI_API_KEY",
  }),
  deepseek: createOpenAiCompatibleProvider({
    id: "deepseek",
    displayName: "DeepSeek",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    baseURL: "https://api.deepseek.com",
  }),
  anthropic: createAnthropicProvider(),
};

export function getProvider(id: ProviderId): AiProvider {
  const provider = providers[id];
  if (!provider) {
    throw new Error(`Unknown provider: ${id}`);
  }
  return provider;
}

export function listProviders(): AiProvider[] {
  return Object.values(providers);
}

export function listConfiguredProviders(): AiProvider[] {
  return listProviders().filter((p) => p.isConfigured());
}

export function getProviderForModel(modelId: string): AiProvider | null {
  for (const provider of listProviders()) {
    if (provider.listModels().some((m) => m.id === modelId)) {
      return provider;
    }
  }
  return null;
}
