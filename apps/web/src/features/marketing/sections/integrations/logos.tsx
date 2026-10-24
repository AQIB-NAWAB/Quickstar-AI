import React from "react";

interface LogoProps { className?: string; size?: number; }

// 19. HTTP API: Clean code bracket symbol </ >
export function HttpApiLogo({ className = "", size = 36 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Left chevron */}
      <path d="M16 16l-8 8 8 8" />
      {/* Slash */}
      <path d="M28 14l-8 20" />
      {/* Right chevron */}
      <path d="M32 16l8 8-8 8" />
    </svg>
  );
}

// 20. MCP: Official Model Context Protocol folded ribbon M mark
export function McpLogo({ className = "", size = 36 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Folded paperclip/ribbon M symbol */}
      <path d="M12 36V16a4 4 0 0 1 8 0v16a4 4 0 0 0 8 0V16a4 4 0 0 1 8 0v20" />
    </svg>
  );
}

// 21. Webhooks: Interlocking chain link symbol
export function WebhooksLogo({ className = "", size = 36 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Diagonal link symbol */}
      <path d="M19 29l-3 3a7.07 7.07 0 0 1-10-10l6-6a7.07 7.07 0 0 1 10 0l1 1" />
      <path d="M29 19l3-3a7.07 7.07 0 0 1 10 10l-6 6a7.07 7.07 0 0 1-10 0l-1-1" />
      <line x1="18" y1="30" x2="30" y2="18" />
    </svg>
  );
}

// Map each integration id to its logo component

const BRAND_ASSETS: Record<string, string> = {"openai": "openai", "anthropic": "anthropic", "gemini": "gemini", "openrouter": "openrouter", "ollama": "ollama", "deepgram": "deepgram", "cartesia": "cartesia", "google_calendar": "google-calendar", "hubspot": "hubspot", "slack": "slack", "notion": "notion", "salesforce": "salesforce", "zendesk": "zendesk", "google_sheets": "google-sheets", "twilio": "twilio", "retell_ai": "retell", "mailchimp": "mailchimp", "zapier": "zapier", "mcp": "mcp"};

export function renderIntegrationLogo(id: string, size = 36, className = "") {
 const asset = BRAND_ASSETS[id];
 if (asset) return <img src={`/marketing/integrations/${asset}.svg`} width={size} height={size} className={className} alt="" aria-hidden="true" draggable={false} />;
 if (id === "http_api") return <HttpApiLogo size={size} className={className} />;
 if (id === "mcp") return <McpLogo size={size} className={className} />;
 if (id === "webhooks") return <WebhooksLogo size={size} className={className} />;
 return null;
}
