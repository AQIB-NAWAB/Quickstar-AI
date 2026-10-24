export interface IntegrationProvider {
  name: string;
  logo: string;
}

/** Existing provider artwork; source attribution lives beside the SVG assets. */
export const BUILT_ON_PROVIDERS: readonly IntegrationProvider[] = [
  { name: "OpenAI", logo: "openai" },
  { name: "Anthropic", logo: "anthropic" },
  { name: "Gemini", logo: "gemini" },
  { name: "OpenRouter", logo: "openrouter" },
  { name: "Ollama", logo: "ollama" },
  { name: "Twilio", logo: "twilio" },
  { name: "Deepgram", logo: "deepgram" },
  { name: "Cartesia", logo: "cartesia" },
  { name: "Retell AI", logo: "retell" },
  { name: "Google Calendar", logo: "google-calendar-cutout" },
  { name: "Google Sheets", logo: "google-sheets-cutout-v2" },
] as const;
