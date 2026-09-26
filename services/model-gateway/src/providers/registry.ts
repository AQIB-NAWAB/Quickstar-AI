import type { ModelGatewayConfig } from "../config/environment.js";
import { AppError, ErrorCode } from "@quickstart/errors";
import { AnthropicChatProvider } from "./anthropic.provider.js";
import { FakeChatProvider } from "./fake.provider.js";
import { OpenAiCompatibleProvider } from "./openai-compatible.provider.js";
import { OpenRouterChatProvider } from "./openrouter.provider.js";
import type { ChatProvider } from "./types.js";

export type ProviderRegistry = {
  get(profileId: string): ChatProvider;
  listProfileIds(): string[];
};

export function createProviderRegistry(config: ModelGatewayConfig): ProviderRegistry {
  const providers = new Map<string, ChatProvider>();

  for (const profile of config.providerProfiles) {
    let provider: ChatProvider;
    switch (profile.driver) {
      case "fake":
        provider = new FakeChatProvider();
        break;
      case "openai_compatible":
        provider = new OpenAiCompatibleProvider(profile);
        break;
      case "openrouter":
        provider = new OpenRouterChatProvider(profile);
        break;
      case "anthropic":
        provider = new AnthropicChatProvider(profile);
        break;
      default:
        throw new Error(`Unknown driver ${profile.driver as string} for profile ${profile.id}`);
    }
    providers.set(profile.id, provider);
  }

  if (!providers.has("fake")) {
    providers.set("fake", new FakeChatProvider());
  }

  return {
    get(profileId: string): ChatProvider {
      const provider = providers.get(profileId);
      if (!provider) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: `Unknown provider profile: ${profileId}`,
        });
      }
      return provider;
    },
    listProfileIds(): string[] {
      return [...providers.keys()];
    },
  };
}
