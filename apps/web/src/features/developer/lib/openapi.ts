import type { OpenApiOperation } from "./types";

export const OPENAPI_OPERATIONS: OpenApiOperation[] = [
  // Knowledge
  {
    id: "knowledge_list_sources",
    method: "get",
    path: "/v1/workspaces/{workspaceId}/knowledge/sources",
    summary: "List knowledge sources",
    description: "Returns all indexed documents, URLs, and vector stores for this workspace.",
    tags: ["Knowledge"],
    security: ["Bearer token"],
    requiredPermission: "workspace.knowledge.read",
    parameters: [
      {
        name: "workspaceId",
        in: "path",
        required: true,
        description: "The unique UUID of the workspace",
        schema: { type: "string" },
      },
      {
        name: "status",
        in: "query",
        required: false,
        description: "Filter by status (ready, processing, failed)",
        schema: { type: "string" },
      },
    ],
    responseExample: {
      status: 200,
      description: "Successful response returning list of sources",
      body: {
        sources: [
          {
            id: "src_9f8a12bc",
            name: "support-handbook-2024.pdf",
            type: "document",
            status: "ready",
            chunk_count: 142,
            size_bytes: 1048576,
            created_at: "2024-04-15T10:30:00Z",
          },
        ],
        total: 1,
      },
    },
    hasSpecCoverage: true,
  },
  {
    id: "knowledge_upload",
    method: "post",
    path: "/v1/workspaces/{workspaceId}/knowledge/sources/upload",
    summary: "Upload knowledge document",
    description: "Uploads a raw PDF, markdown, or text document for vectorization and semantic search.",
    tags: ["Knowledge"],
    security: ["Bearer token"],
    requiredPermission: "workspace.knowledge.manage",
    parameters: [
      {
        name: "workspaceId",
        in: "path",
        required: true,
        description: "The unique UUID of the workspace",
        schema: { type: "string" },
      },
    ],
    requestBody: {
      description: "Document ingestion configuration",
      required: true,
      example: {
        name: "customer-policy-v2.pdf",
        chunk_size: 512,
        chunk_overlap: 50,
      },
    },
    responseExample: {
      status: 201,
      description: "Document accepted for indexing",
      body: {
        source_id: "src_3d81b49a",
        status: "processing",
        upload_url: "https://storage.quickstart.ai/upload/src_3d81b49a",
      },
    },
    hasSpecCoverage: true,
  },

  // Agents
  {
    id: "agents_list",
    method: "get",
    path: "/v1/workspaces/{workspaceId}/agents",
    summary: "List workspace agents",
    description: "Retrieve all autonomous AI agents configured in this workspace.",
    tags: ["Agents"],
    security: ["Bearer token"],
    requiredPermission: "workspace.agents.read",
    parameters: [
      {
        name: "workspaceId",
        in: "path",
        required: true,
        description: "The unique UUID of the workspace",
        schema: { type: "string" },
      },
    ],
    responseExample: {
      status: 200,
      description: "List of workspace agents",
      body: {
        agents: [
          {
            id: "ag_4a821e90",
            name: "Customer Support Agent",
            model: "gemini-1.5-pro",
            temperature: 0.2,
            status: "active",
            created_at: "2024-04-10T14:20:00Z",
          },
        ],
      },
    },
    hasSpecCoverage: true,
  },
  {
    id: "agents_create",
    method: "post",
    path: "/v1/workspaces/{workspaceId}/agents",
    summary: "Create new agent",
    description: "Registers a new AI agent with system instructions and tool assignments.",
    tags: ["Agents"],
    security: ["Bearer token"],
    requiredPermission: "workspace.agents.manage",
    parameters: [
      {
        name: "workspaceId",
        in: "path",
        required: true,
        description: "The unique UUID of the workspace",
        schema: { type: "string" },
      },
    ],
    requestBody: {
      description: "Agent creation payload",
      required: true,
      example: {
        name: "Inbound Sales Qualifier",
        system_prompt: "You are a courteous qualification assistant for SaaS inbound leads.",
        model: "gemini-1.5-flash",
        temperature: 0.3,
      },
    },
    responseExample: {
      status: 201,
      description: "Agent created successfully",
      body: {
        id: "ag_89e211ca",
        name: "Inbound Sales Qualifier",
        status: "active",
      },
    },
    hasSpecCoverage: true,
  },

  // Conversations
  {
    id: "conversations_create",
    method: "post",
    path: "/v1/workspaces/{workspaceId}/conversations",
    summary: "Start conversation session",
    description: "Initializes a stateful chat session with an assigned agent.",
    tags: ["Conversations"],
    security: ["Bearer token"],
    requiredPermission: "workspace.conversations.manage",
    parameters: [
      {
        name: "workspaceId",
        in: "path",
        required: true,
        description: "The unique UUID of the workspace",
        schema: { type: "string" },
      },
    ],
    requestBody: {
      description: "Conversation session configuration",
      required: true,
      example: {
        agent_id: "ag_4a821e90",
        user_identifier: "cust_9921",
        initial_message: "Hello, I need help updating my billing information.",
      },
    },
    responseExample: {
      status: 201,
      description: "Conversation started",
      body: {
        conversation_id: "conv_718290fa",
        status: "open",
        agent_reply: "I'd be glad to help you update your billing details. Can you verify your account email?",
      },
    },
    hasSpecCoverage: true,
  },

  // Webhooks
  {
    id: "webhooks_list",
    method: "get",
    path: "/v1/workspaces/{workspaceId}/webhooks",
    summary: "List webhook subscriptions",
    description: "Retrieve all registered outbound event subscription URLs and health statuses.",
    tags: ["Webhooks"],
    security: ["Bearer token"],
    requiredPermission: "workspace.webhooks.read",
    parameters: [
      {
        name: "workspaceId",
        in: "path",
        required: true,
        description: "The unique UUID of the workspace",
        schema: { type: "string" },
      },
    ],
    responseExample: {
      status: 200,
      description: "List of registered webhooks",
      body: {
        webhooks: [
          {
            id: "wh_219084af",
            url: "https://api.acme.ai/webhooks/incoming",
            events: ["conversation.ended", "lead.qualified"],
            status: "active",
            created_at: "2024-04-12T08:00:00Z",
          },
        ],
      },
    },
    hasSpecCoverage: true,
  },
  {
    id: "webhooks_create",
    method: "post",
    path: "/v1/workspaces/{workspaceId}/webhooks",
    summary: "Create webhook subscription",
    description: "Register a secure HTTP POST endpoint to receive signed real-time events.",
    tags: ["Webhooks"],
    security: ["Bearer token"],
    requiredPermission: "workspace.webhooks.manage",
    parameters: [
      {
        name: "workspaceId",
        in: "path",
        required: true,
        description: "The unique UUID of the workspace",
        schema: { type: "string" },
      },
    ],
    requestBody: {
      description: "Webhook registration details",
      required: true,
      example: {
        url: "https://api.acme.ai/webhooks/events",
        events: ["conversation.completed", "campaign.attention_required"],
      },
    },
    responseExample: {
      status: 201,
      description: "Webhook created with signing secret (shown once)",
      body: {
        id: "wh_54b01e23",
        url: "https://api.acme.ai/webhooks/events",
        signing_secret: "whsec_live_9a7b6c5d4e3f210987654321fedcba",
        status: "active",
      },
    },
    hasSpecCoverage: true,
  },

  // Analytics & Audit
  {
    id: "analytics_get",
    method: "get",
    path: "/v1/workspaces/{workspaceId}/analytics",
    summary: "Get usage & token analytics",
    description: "Aggregated tokens, request counts, percentiles, and cost by service model.",
    tags: ["Analytics"],
    security: ["Bearer token"],
    requiredPermission: "workspace.analytics.read",
    parameters: [
      {
        name: "workspaceId",
        in: "path",
        required: true,
        description: "The unique UUID of the workspace",
        schema: { type: "string" },
      },
      {
        name: "range",
        in: "query",
        required: false,
        description: "Time range (7d, 30d, 90d)",
        schema: { type: "string", default: "7d" },
      },
    ],
    responseExample: {
      status: 200,
      description: "Analytics summary and daily buckets",
      body: {
        summary: {
          total_tokens: 1420500,
          input_tokens: 890000,
          output_tokens: 530500,
          total_cost: 14.82,
          p50_latency_ms: 320,
          p95_latency_ms: 1140,
        },
      },
    },
    hasSpecCoverage: true,
  },
  {
    id: "audit_list",
    method: "get",
    path: "/v1/workspaces/{workspaceId}/audit",
    summary: "Query audit trail",
    description: "Search append-only compliance logs of administrative actions and credentials.",
    tags: ["Audit"],
    security: ["Bearer token"],
    requiredPermission: "workspace.audit.read",
    parameters: [
      {
        name: "workspaceId",
        in: "path",
        required: true,
        description: "The unique UUID of the workspace",
        schema: { type: "string" },
      },
      {
        name: "q",
        in: "query",
        required: false,
        description: "Search actor, target, or request ID",
        schema: { type: "string" },
      },
    ],
    responseExample: {
      status: 200,
      description: "List of audit entries",
      body: {
        entries: [
          {
            id: "aud_9a8b7c6d",
            action: "api_key.created",
            actor_name: "Sarah Chen",
            target_type: "api_key",
            created_at: "2024-04-17T14:32:01Z",
          },
        ],
        total: 1,
      },
    },
    hasSpecCoverage: true,
  },
];
