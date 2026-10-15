import { createApiRouter, createServiceRouter, type Router } from "@quickstart/http-server";
import type { GatewayHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createAgentProxyRoutes } from "./proxy-agent.routes.js";
import { createConversationProxyRoutes } from "./proxy-conversation.routes.js";
import { createIdentityProxyRoutes } from "./proxy-identity.routes.js";
import { createRuntimeProxyRoutes } from "./proxy-runtime.routes.js";
import { createKnowledgeProxyRoutes } from "./proxy-knowledge.routes.js";
import { createMemoryProxyRoutes } from "./proxy-memory.routes.js";
import { createSecretsProxyRoutes } from "./proxy-secrets.routes.js";
import { createWorkflowProxyRoutes } from "./proxy-workflow.routes.js";
import { createCampaignProxyRoutes } from "./proxy-campaign.routes.js";
import { createVoiceProxyRoutes } from "./proxy-voice.routes.js";
import { createLeadProxyRoutes } from "./proxy-lead.routes.js";
import { createEvalProxyRoutes } from "./proxy-eval.routes.js";
import { createUsageProxyRoutes } from "./proxy-usage.routes.js";
import { createAuditProxyRoutes } from "./proxy-audit.routes.js";
import { createWorkspaceProxyRoutes } from "./proxy-workspace.routes.js";
import { createWidgetPublicRoutes } from "./widget-public.routes.js";

import { createLeadGenerationProxyRoutes } from "./proxy-lead-generation.routes.js";
import { createCustomLlmRoutes } from "./custom-llm.routes.js";

const gatewayRouteModules = [
  createCustomLlmRoutes,
  createLeadGenerationProxyRoutes,
  createHealthRoutes,
  createWidgetPublicRoutes,
  createIdentityProxyRoutes,
  createWorkspaceProxyRoutes,
  createAgentProxyRoutes,
  createConversationProxyRoutes,
  createRuntimeProxyRoutes,
  createKnowledgeProxyRoutes,
  createMemoryProxyRoutes,
  createSecretsProxyRoutes,
  createWorkflowProxyRoutes,
  createCampaignProxyRoutes,
  createVoiceProxyRoutes,
  createLeadProxyRoutes,
  createEvalProxyRoutes,
  createUsageProxyRoutes,
  createAuditProxyRoutes,
] as const;

export function createGatewayApiRouter(context: GatewayHttpContext): Router {
  const root = createServiceRouter();
  root.use(context.redisRateLimit);
  root.use(createApiRouter(context, gatewayRouteModules));
  return root;
}
