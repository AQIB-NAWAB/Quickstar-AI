export type IntegrationTrack = "top" | "middle" | "bottom";

export type IntegrationCategory =
  | "Model & Intelligence"
  | "Voice & Telephony"
  | "Productivity & Workspace"
  | "CRM & Sales"
  | "Support & Helpdesk"
  | "Marketing & Email"
  | "Automation & Protocols";

export type IntegrationStatus = "operational" | "in_development" | "planned";

export interface IntegrationItemData {
  id: string;
  name: string;
  shortLabel?: string;
  track: IntegrationTrack;
  trackIndex: number;
  category: IntegrationCategory;
  hasAccentRing?: boolean;
  status: IntegrationStatus;
  statusLabel: string;
  shortDescription: string;
  supportedOperations: string[];
  evidenceReference: string;
  // Normalized 1440x570 scene coordinates (percentages for fluid CSS placement)
  sceneX: number;
  sceneY: number;
}

export interface DecorativePlusData {
  id: string;
  track: IntegrationTrack;
  sceneX: number;
  sceneY: number;
}

export const SCENE_VIEWBOX = {
  width: 1440,
  height: 570,
};

// Canonical 21 integrations in exact order specified by the approved design
export const INTEGRATION_ITEMS: IntegrationItemData[] = [
  // --- TOP TRACK (Models & Audio) ---
  {
    id: "openai",
    name: "OpenAI",
    track: "top",
    trackIndex: 0,
    category: "Model & Intelligence",
    status: "operational",
    statusLabel: "Operational in runtime",
    shortDescription:
      "Large language models (GPT-4o, o3-mini) and Realtime WebSocket audio sessions powering conversational voice turns.",
    supportedOperations: [
      "Realtime bi-directional voice streaming",
      "Function tool execution",
      "Structured conversation turns",
      "Evaluation test runs",
    ],
    evidenceReference:
      "services/voice-service/src/widget-voice/openai-realtime-session.ts",
    sceneX: 76,
    sceneY: 60,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    track: "top",
    trackIndex: 1,
    category: "Model & Intelligence",
    status: "operational",
    statusLabel: "Operational in runtime",
    shortDescription:
      "Claude 3.5 Sonnet and Haiku models via streaming chat driver for nuanced reasoning and complex instructions.",
    supportedOperations: [
      "Instruction-following agent turns",
      "Tool call schema dispatch",
      "Streaming tokens via Model Gateway",
      "Multi-turn context retention",
    ],
    evidenceReference:
      "services/model-gateway/src/providers/anthropic.provider.ts",
    sceneX: 242,
    sceneY: 115,
  },
  {
    id: "gemini",
    name: "Gemini",
    track: "top",
    trackIndex: 2,
    category: "Model & Intelligence",
    status: "operational",
    statusLabel: "Operational in runtime",
    shortDescription:
      "Gemini Live WebSocket sessions and Multimodal Flash models for low-latency reasoning and audio generation.",
    supportedOperations: [
      "Gemini Live duplex voice sessions",
      "High-throughput knowledge retrieval",
      "Function declaration execution",
      "Context window extension",
    ],
    evidenceReference:
      "services/voice-service/src/widget-voice/gemini-live-session.ts",
    sceneX: 510,
    sceneY: 150,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    track: "top",
    trackIndex: 3,
    category: "Model & Intelligence",
    status: "operational",
    statusLabel: "Operational in runtime",
    shortDescription:
      "Multi-provider LLM gateway routing agent queries across open and proprietary model endpoints with fallback.",
    supportedOperations: [
      "Dynamic provider fallback routing",
      "Open-source model streaming",
      "Usage attribution and spend tracking",
      "Latency-optimized load balancing",
    ],
    evidenceReference:
      "services/model-gateway/src/providers/openrouter.provider.ts",
    sceneX: 720,
    sceneY: 160,
  },
  {
    id: "ollama",
    name: "Ollama",
    track: "top",
    trackIndex: 4,
    category: "Model & Intelligence",
    status: "planned",
    statusLabel: "Planned compatibility",
    shortDescription:
      "Local self-hosted model execution interface planned for on-premise private workspace deployments.",
    supportedOperations: [
      "Self-hosted model endpoint targets",
      "Air-gapped private inference",
      "Custom local weights support",
      "Compatible OpenAI driver protocol",
    ],
    evidenceReference: "docs/ai-roadmap.md (Self-hosted model runner)",
    sceneX: 930,
    sceneY: 150,
  },
  {
    id: "deepgram",
    name: "Deepgram",
    track: "top",
    trackIndex: 5,
    category: "Voice & Telephony",
    status: "operational",
    statusLabel: "Operational in runtime",
    shortDescription:
      "Nova-2 streaming speech-to-text with interim speech recognition and voice activity endpointing.",
    supportedOperations: [
      "Duplex WebSocket STT streaming",
      "Voice activity endpoint detection",
      "Barge-in speech interruption",
      "Punctuation and smart formatting",
    ],
    evidenceReference: "services/voice-service/src/speech/deepgram-stt.ts",
    sceneX: 1200,
    sceneY: 115,
  },
  {
    id: "cartesia",
    name: "Cartesia",
    track: "top",
    trackIndex: 6,
    category: "Voice & Telephony",
    status: "operational",
    statusLabel: "Operational in runtime",
    shortDescription:
      "Sonic low-latency text-to-speech engine delivering human-like voice synthesis with custom voice cloning.",
    supportedOperations: [
      "Sub-150ms first-chunk audio synthesis",
      "Duplex PCM16 and mu-law streaming",
      "Custom voice ID configuration",
      "Dynamic prosody & emotion controls",
    ],
    evidenceReference: "services/voice-service/src/speech/cartesia-tts.ts",
    sceneX: 1366,
    sceneY: 60,
  },

  // --- MIDDLE TRACK (Business Tools & CRM) ---
  {
    id: "google_calendar",
    name: "Google Calendar",
    track: "middle",
    trackIndex: 7,
    category: "Productivity & Workspace",
    hasAccentRing: true, // Default emphasized ring matching the approved image
    status: "operational",
    statusLabel: "Verified workspace adapter",
    shortDescription:
      "Two-step OAuth 2.0 PKCE calendar integration for checking free/busy availability and booking customer appointments.",
    supportedOperations: [
      "Free/busy availability lookups",
      "Appointment creation",
      "Calendar selection",
      "Calendar event cancellation",
    ],
    evidenceReference:
      "services/workspace-service/src/integrations/provider-registry.ts#L55",
    sceneX: 96,
    sceneY: 235,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    track: "middle",
    trackIndex: 8,
    category: "CRM & Sales",
    status: "operational",
    statusLabel: "Verified workspace adapter",
    shortDescription:
      "CRM adapter synchronizing contacts, deals, and conversation transcripts into HubSpot pipelines.",
    supportedOperations: [
      "Contact discovery and creation",
      "Deal stage synchronization",
      "Engagement and call activity logs",
      "Custom property schema mapping",
    ],
    evidenceReference:
      "services/workspace-service/src/integrations/provider-registry.ts#L225",
    sceneX: 331,
    sceneY: 280,
  },
  {
    id: "slack",
    name: "Slack",
    track: "middle",
    trackIndex: 9,
    category: "Productivity & Workspace",
    status: "operational",
    statusLabel: "Verified workspace adapter",
    shortDescription:
      "Team alert notifications, human handoff escalation alerts, and channel bot responses.",
    supportedOperations: [
      "Real-time human handoff alerts",
      "Lead capture channel notifications",
      "Direct message escalation threads",
      "Operator command shortcuts",
    ],
    evidenceReference:
      "services/workspace-service/src/integrations/provider-registry.ts#L415",
    sceneX: 510,
    sceneY: 310,
  },
  {
    id: "notion",
    name: "Notion",
    track: "middle",
    trackIndex: 10,
    category: "Productivity & Workspace",
    status: "operational",
    statusLabel: "Verified workspace adapter",
    shortDescription:
      "Knowledge sync adapter indexing documentation pages and writing captured leads into Notion databases.",
    supportedOperations: [
      "Knowledge extraction from pages",
      "Lead database row insertion",
      "Scheduled page re-indexing",
      "Database schema synchronization",
    ],
    evidenceReference:
      "services/workspace-service/src/integrations/provider-registry.ts#L680",
    sceneX: 720,
    sceneY: 320,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    track: "middle",
    trackIndex: 11,
    category: "CRM & Sales",
    status: "operational",
    statusLabel: "Verified workspace adapter",
    shortDescription:
      "Enterprise CRM connector creating Leads, Contacts, and Task objects with cryptographic refresh token rotation.",
    supportedOperations: [
      "Lead & Contact bidirectional sync",
      "Call outcome Task creation",
      "Custom object query execution",
      "Confidential token vault persistence",
    ],
    evidenceReference:
      "services/workspace-service/src/integrations/provider-registry.ts#L320",
    sceneX: 930,
    sceneY: 310,
  },
  {
    id: "zendesk",
    name: "Zendesk",
    track: "middle",
    trackIndex: 12,
    category: "Support & Helpdesk",
    status: "operational",
    statusLabel: "Verified workspace adapter",
    shortDescription:
      "Support ticketing adapter creating and updating tickets with caller transcripts and sentiment summaries.",
    supportedOperations: [
      "Support ticket creation",
      "Call transcript comment appending",
      "Priority and status updates",
      "Requester identity linking",
    ],
    evidenceReference:
      "services/workspace-service/src/integrations/provider-registry.ts#L590",
    sceneX: 1135,
    sceneY: 280,
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    track: "middle",
    trackIndex: 13,
    category: "Productivity & Workspace",
    status: "operational",
    statusLabel: "Verified workspace adapter",
    shortDescription:
      "Spreadsheet integration appending qualified leads and campaign attempts to customer Google Sheets in real time.",
    supportedOperations: [
      "Append rows for qualified leads",
      "Read reference lookup tables",
      "Header auto-detection & alignment",
      "Formula-safe cell sanitization",
    ],
    evidenceReference:
      "services/workspace-service/src/integrations/provider-registry.ts#L140",
    sceneX: 1350,
    sceneY: 235,
  },

  // --- BOTTOM TRACK (Telephony, Marketing & Developer Protocols) ---
  {
    id: "twilio",
    name: "Twilio",
    track: "bottom",
    trackIndex: 14,
    category: "Voice & Telephony",
    status: "operational",
    statusLabel: "Operational in runtime",
    shortDescription:
      "Telephony carrier integration managing phone numbers, TwiML webhooks, and duplex WebSocket Media Streams.",
    supportedOperations: [
      "Inbound call media stream routing",
      "Outbound campaign dialing dispatch",
      "G.711 mu-law audio transcoding",
      "Caller ID and DNC suppression binding",
    ],
    evidenceReference:
      "services/voice-service/src/telephony/media-stream-server.ts",
    sceneX: 85,
    sceneY: 405,
  },
  {
    id: "retell_ai",
    name: "Retell AI",
    track: "bottom",
    trackIndex: 15,
    category: "Voice & Telephony",
    status: "in_development",
    statusLabel: "In active development",
    shortDescription:
      "Voice telephony interoperability adapter enabling existing Retell agent configurations to run on QuickStart AI infrastructure.",
    supportedOperations: [
      "Telephony session bridging",
      "SIP trunk interconnect",
      "Audio stream pass-through",
      "Agent prompt schema migration",
    ],
    evidenceReference: "docs/landing-page-roadmap.md (Voice platform candidate)",
    sceneX: 311,
    sceneY: 450,
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    track: "bottom",
    trackIndex: 16,
    category: "Marketing & Email",
    status: "operational",
    statusLabel: "Verified workspace adapter",
    shortDescription:
      "Audience adapter adding qualified call contacts into marketing email segments and trigger campaigns.",
    supportedOperations: [
      "Audience list member subscribe",
      "Interest tag assignment",
      "Merge field value mapping",
      "Opt-out and unsubscribe sync",
    ],
    evidenceReference:
      "services/workspace-service/src/integrations/provider-registry.ts#L775",
    sceneX: 510,
    sceneY: 475,
  },
  {
    id: "zapier",
    name: "Zapier",
    track: "bottom",
    trackIndex: 17,
    category: "Automation & Protocols",
    status: "operational",
    statusLabel: "Operational via Webhooks",
    shortDescription:
      "Trigger thousands of Zapier Zaps from conversation events, lead captures, and completed call workflows.",
    supportedOperations: [
      "Trigger Zaps on new lead captured",
      "Dispatch completed call payloads",
      "Catch Hook payload validation",
      "Two-way automated action runs",
    ],
    evidenceReference:
      "services/workflow-service/src/services/workflows.service.ts",
    sceneX: 720,
    sceneY: 485,
  },
  {
    id: "http_api",
    name: "HTTP API",
    track: "bottom",
    trackIndex: 18,
    category: "Automation & Protocols",
    status: "operational",
    statusLabel: "Core platform capability",
    shortDescription:
      "Custom HTTP tool calls configured in the agent canvas with HMAC headers, URL parameters, and JSON payloads.",
    supportedOperations: [
      "Custom REST endpoint tool invocation",
      "SSRF-guarded private network defense",
      "Dynamic conversation variable injection",
      "Status code and timeout handling",
    ],
    evidenceReference: "services/workflow-service/src/engine/actions.ts",
    sceneX: 930,
    sceneY: 475,
  },
  {
    id: "mcp",
    name: "MCP",
    track: "bottom",
    trackIndex: 19,
    category: "Automation & Protocols",
    status: "operational",
    statusLabel: "Core protocol client",
    shortDescription:
      "Model Context Protocol client connection exposing local tools, data resources, and developer agents to conversational agents.",
    supportedOperations: [
      "Tool discovery and JSON-RPC dispatch",
      "Dynamic resource schema reading",
      "Secure sidecar process execution",
      "Structured error response parsing",
    ],
    evidenceReference: "docs/architecture/mcp-integration-spec.md",
    sceneX: 1135,
    sceneY: 450,
  },
  {
    id: "webhooks",
    name: "Webhooks",
    track: "bottom",
    trackIndex: 20,
    category: "Automation & Protocols",
    status: "operational",
    statusLabel: "Core platform capability",
    shortDescription:
      "Durable outbound webhook queue dispatching signed HMAC-SHA256 event payloads with exponential backoff and replay.",
    supportedOperations: [
      "Event dispatch on call / lead updates",
      "HMAC-SHA256 signature verification",
      "Durable queue with retry backoff",
      "Manual redrive and delivery inspection",
    ],
    evidenceReference:
      "services/workspace-service/src/services/webhooks.service.ts",
    sceneX: 1350,
    sceneY: 405,
  },
];

// Six small plus medallions strategically placed along the curved tracks
export const DECORATIVE_PLUS_ITEMS: DecorativePlusData[] = [
  { id: "plus-top-1", track: "top", sceneX: 405, sceneY: 134 },
  { id: "plus-top-2", track: "top", sceneX: 1035, sceneY: 134 },
  { id: "plus-mid-1", track: "middle", sceneX: 200, sceneY: 260 },
  { id: "plus-mid-2", track: "middle", sceneX: 1035, sceneY: 296 },
  { id: "plus-bot-1", track: "bottom", sceneX: 200, sceneY: 430 },
  { id: "plus-bot-2", track: "bottom", sceneX: 1035, sceneY: 464 },
];

// SVG path definitions for the 3 shallow U-shaped curves behind medallions
// ViewBox is 0 0 1440 570
export const TRACK_CURVE_PATHS = {
  top: "M -20 28 Q 720 292 1460 28",
  middle: "M -20 208 Q 720 430 1460 208",
  bottom: "M -20 380 Q 720 590 1460 380",
};
