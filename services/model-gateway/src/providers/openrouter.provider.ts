import type { ProviderProfileConfig } from "../config/environment.js";
import { OpenAiCompatibleProvider } from "./openai-compatible.provider.js";

/** OpenRouter uses OpenAI-compatible chat; profile id and headers differ. */
export class OpenRouterChatProvider extends OpenAiCompatibleProvider {
  readonly driver = "openrouter";

  constructor(config: ProviderProfileConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl ?? "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "https://quickstart.local",
        "X-Title": process.env.OPENROUTER_TITLE ?? "QuickStart",
        ...config.defaultHeaders,
      },
    });
  }
}
