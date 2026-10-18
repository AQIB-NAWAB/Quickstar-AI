import {
  PLATFORM_EVENT_TYPES,
  isWorkflowGraphShape,
  validateWorkflowGraph,
  type WorkflowGraph,
  type WorkflowSettings,
  type WorkflowSimulationResult,
  type WorkflowValidationResult,
} from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  ConditionGroup,
  WorkflowAction,
  WorkflowDefinition,
  WorkflowListItem,
  WorkflowRunRecord,
  WorkflowStatus,
  WorkflowVersionRecord,
} from "../domain/types.js";
import { convertLinearToGraph } from "../domain/types.js";
import { simulateWorkflowGraph } from "../engine/simulator.js";
import type { WorkflowsRepository } from "../repository/workflows.repository.js";

const ACTION_KINDS = new Set([
  "webhook",
  "update_tags",
  "email_notification",
  "notification",
  "agent_handoff",
  "log",
  "end",
]);

export type WorkflowTemplateItem = {
  id: string;
  name: string;
  category:
    "Sales & Leads" | "Support" | "Customer Success" | "Resolution" | "Operations" | "Integrations";
  description: string;
  trigger_event_type: string;
  badge?: string;
  steps_count: number;
  graph: WorkflowGraph;
};

export class WorkflowsService {
  constructor(
    private readonly repo: WorkflowsRepository,
    private readonly maxActivePerWorkspace: number,
  ) {}

  list(workspaceId: string): Promise<WorkflowListItem[]> {
    return this.repo.list(workspaceId);
  }

  async get(workspaceId: string, workflowId: string): Promise<WorkflowDefinition> {
    const wf = await this.repo.get(workspaceId, workflowId);
    if (!wf) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Workflow not found" });
    }
    return wf;
  }

  getStats(workspaceId: string) {
    return this.repo.getStats(workspaceId);
  }

  async create(
    workspaceId: string,
    body: {
      name?: string;
      description?: string | null;
      trigger_event_type?: string;
      condition_group?: ConditionGroup | null;
      actions?: WorkflowAction[];
      draft_graph?: WorkflowGraph | null;
      settings?: WorkflowSettings;
      status?: WorkflowStatus;
    },
  ): Promise<WorkflowDefinition> {
    const name = body.name?.trim();
    if (!name) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "name is required" });
    }
    const trigger = body.trigger_event_type?.trim();
    if (!trigger || !(PLATFORM_EVENT_TYPES as readonly string[]).includes(trigger)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `trigger_event_type must be one of: ${PLATFORM_EVENT_TYPES.join(", ")}`,
      });
    }

    if (body.status && body.status !== "draft")
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Create a draft first, then use the authorized activation endpoint.",
      });
    if (body.draft_graph && !isWorkflowGraphShape(body.draft_graph))
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid graph shape" });
    checkSettings(body.settings);
    const status = "draft" as const;

    return this.repo.create({
      workspaceId,
      name,
      description: body.description ?? null,
      triggerEventType: trigger,
      conditionGroup: body.condition_group ?? null,
      actions: normalizeActions(body.actions ?? []),
      draftGraph: body.draft_graph ?? null,
      settings: body.settings,
      status,
    });
  }

  async update(
    workspaceId: string,
    workflowId: string,
    body: {
      expected_version?: number;
      name?: string;
      description?: string | null;
      trigger_event_type?: string;
      condition_group?: ConditionGroup | null;
      actions?: WorkflowAction[];
      draft_graph?: WorkflowGraph | null;
      settings?: WorkflowSettings;
      status?: WorkflowStatus;
    },
  ): Promise<WorkflowDefinition> {
    if (typeof body.expected_version !== "number") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "expected_version is required",
      });
    }
    if (
      body.trigger_event_type &&
      !(PLATFORM_EVENT_TYPES as readonly string[]).includes(body.trigger_event_type)
    ) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `trigger_event_type must be one of: ${PLATFORM_EVENT_TYPES.join(", ")}`,
      });
    }
    if (body.status !== undefined)
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Use the dedicated activate or pause endpoint to change workflow status.",
      });

    const current = await this.get(workspaceId, workflowId);
    const graph =
      body.draft_graph ??
      (body.actions !== undefined ||
      body.condition_group !== undefined ||
      body.trigger_event_type !== undefined
        ? convertLinearToGraph({
            id: current.id,
            name: body.name ?? current.name,
            triggerEventType: body.trigger_event_type ?? current.triggerEventType,
            conditionGroup:
              body.condition_group !== undefined ? body.condition_group : current.conditionGroup,
            actions: body.actions ? normalizeActions(body.actions) : current.actions,
          })
        : current.draftGraph);
    if (!graph)
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Workflow graph is required",
      });
    return this.saveDraft(workspaceId, workflowId, {
      graph,
      settings: body.settings,
      expectedRevision: body.expected_version,
      name: body.name,
      description: body.description,
    });
  }

  async saveDraft(
    workspaceId: string,
    workflowId: string,
    input: {
      graph: WorkflowGraph;
      settings?: WorkflowSettings;
      expectedRevision?: number;
      name?: string;
      description?: string | null;
    },
  ): Promise<WorkflowDefinition> {
    await this.get(workspaceId, workflowId);
    if (!isWorkflowGraphShape(input.graph))
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Invalid workflow graph shape or limits",
      });
    if (!Number.isInteger(input.expectedRevision) || input.expectedRevision! < 1)
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "expected_revision is required",
      });
    checkSettings(input.settings);
    return this.repo.saveDraft({
      workspaceId,
      workflowId,
      draftGraph: input.graph,
      settings: input.settings,
      expectedRevision: input.expectedRevision!,
      name: input.name,
      description: input.description,
    });
  }

  async activate(
    workspaceId: string,
    workflowId: string,
    options: {
      changelog?: string;
      createdBy?: string;
      expectedRevision?: number;
    } = {},
  ): Promise<{ definition: WorkflowDefinition; versionRecord: WorkflowVersionRecord }> {
    const current = await this.get(workspaceId, workflowId);
    if (!current.draftGraph) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Cannot activate a workflow without a draft graph",
      });
    }

    if (
      !Number.isInteger(options.expectedRevision) ||
      options.expectedRevision !== current.draftRevision
    )
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Save and reload the current revision before activation.",
      });
    const validation = validateWorkflowGraph(current.draftGraph, current.draftRevision);
    if (!validation.valid) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Validation failed: ${validation.summary}`,
        details: { blockers: validation.blockers, warnings: validation.warnings },
      });
    }

    if (current.status !== "active") {
      await this.assertActiveCap(workspaceId);
    }

    const result = await this.repo.activate({
      workspaceId,
      workflowId,
      expectedRevision: options.expectedRevision!,
      activatedByUserId: options.createdBy,
      maxActive: this.maxActivePerWorkspace,
    });

    return { definition: result.workflow, versionRecord: result.version };
  }

  async pause(workspaceId: string, workflowId: string): Promise<WorkflowDefinition> {
    return this.repo.pause(workspaceId, workflowId);
  }

  async listVersions(workspaceId: string, workflowId: string): Promise<WorkflowVersionRecord[]> {
    return this.repo.listVersions(workspaceId, workflowId);
  }

  async delete(workspaceId: string, workflowId: string): Promise<void> {
    const ok = await this.repo.softDelete(workspaceId, workflowId);
    if (!ok) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Workflow not found" });
    }
  }

  listRuns(
    workspaceId: string,
    workflowId?: string,
    options?: {
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ runs: WorkflowRunRecord[]; total: number }> {
    return this.repo.listRuns(workspaceId, workflowId, options);
  }

  async getRun(workspaceId: string, workflowId: string, runId: string): Promise<WorkflowRunRecord> {
    const run = await this.repo.getRun(workspaceId, workflowId, runId);
    if (!run) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Workflow run not found" });
    }
    return run;
  }

  async cancelRun(workspaceId: string, runId: string): Promise<boolean> {
    return this.repo.cancelRun(workspaceId, runId);
  }

  validateGraph(graph: WorkflowGraph, revision = 1): WorkflowValidationResult {
    return validateWorkflowGraph(graph, revision);
  }

  async simulate(
    workspaceId: string,
    workflowId: string,
    input: {
      graph?: WorkflowGraph;
      samplePayload?: Record<string, unknown>;
    },
  ): Promise<WorkflowSimulationResult> {
    const current = await this.get(workspaceId, workflowId);
    let graph = input.graph;
    if (!graph) {
      const current = await this.get(workspaceId, workflowId);
      graph = current.draftGraph ?? undefined;
    }
    if (!graph) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "No graph provided or found on workflow draft",
      });
    }

    if (!isWorkflowGraphShape(graph))
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Invalid graph shape or limits",
      });
    if (
      input.samplePayload !== undefined &&
      (!input.samplePayload ||
        typeof input.samplePayload !== "object" ||
        Array.isArray(input.samplePayload) ||
        JSON.stringify(input.samplePayload).length > 262144)
    )
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Sample event must be a JSON object no larger than 256 KiB",
      });
    const payload = input.samplePayload ?? {
      id: "evt_simulation",
      type: "message.appended",
      conversation_id: "conv_sim_01",
      message: {
        id: "msg_sim_01",
        text: "Hi, I need pricing and an enterprise demo please",
        sender_type: "visitor",
        role: "user",
      },
    };

    const result = simulateWorkflowGraph(graph, payload);
    return { ...result, workflow_id: workflowId, revision: current.draftRevision };
  }

  eventCatalog(): Array<{
    type: string;
    status: "declared";
    fields: string[];
  }> {
    return [
      {
        type: "message.appended",
        status: "declared",
        fields: [
          "event.conversation_id",
          "event.message.id",
          "event.message.text",
          "event.message.role",
          "event.message.sender_type",
          "event.timestamp",
        ],
      },
      {
        type: "conversation.handed_off",
        status: "declared",
        fields: [
          "event.conversation_id",
          "event.assignee_user_id",
          "event.queue_id",
          "event.priority",
        ],
      },
      {
        type: "conversation.released",
        status: "declared",
        fields: ["event.conversation_id", "event.released_by_user_id", "event.resolution_status"],
      },
      {
        type: "agent.published",
        status: "declared",
        fields: ["event.agent_id", "event.version", "event.published_by"],
      },
    ];
  }

  listTemplates(): WorkflowTemplateItem[] {
    return [
      {
        id: "lead_routing_tagging",
        name: "Lead Routing & Tagging",
        category: "Sales & Leads",
        description:
          "Detect high-intent keywords in visitor chat messages, tag conversations as qualified leads, and route directly to the inbound sales team.",
        trigger_event_type: "message.appended",
        badge: "Popular",
        steps_count: 4,
        graph: {
          schema_version: 1,
          entry_node_id: "node_trig_lead",
          viewport: { x: 50, y: 100, zoom: 1 },
          nodes: [
            {
              id: "node_trig_lead",
              type: "trigger",
              name: "Visitor message received",
              subtitle: "message.appended",
              position: { x: 80, y: 220 },
              config: {
                event_type: "message.appended",
                run_for: "visitor_messages",
                agent_scope: "all",
                channel_scope: "all",
                deduplicate_events: true,
              },
            },
            {
              id: "node_cond_intent",
              type: "condition",
              name: "High-intent keyword check",
              subtitle: "Matches demo, pricing, enterprise",
              position: { x: 380, y: 220 },
              config: {
                root_group: {
                  id: "grp_intent",
                  logic: "or",
                  rules: [
                    { id: "r1", field: "message.text", operator: "contains", value: "pricing" },
                    { id: "r2", field: "message.text", operator: "contains", value: "demo" },
                    { id: "r3", field: "message.text", operator: "contains", value: "enterprise" },
                  ],
                },
                missing_value_behavior: "not_matched",
                case_sensitive: false,
              },
            },
            {
              id: "node_tag_lead",
              type: "update_tags",
              name: "Add lead tag",
              subtitle: "conversation: qualified-lead",
              position: { x: 680, y: 160 },
              config: {
                target_resource: "conversation",
                operation: "add",
                tags: ["qualified-lead", "high-intent"],
              },
            },
            {
              id: "node_handoff_sales",
              type: "agent_handoff",
              name: "Route to Inbound Sales",
              subtitle: "Queue: sales_inbound (High)",
              position: { x: 960, y: 160 },
              config: {
                destination_type: "human",
                queue_id: "sales_inbound",
                priority: "high",
                pause_ai_replies: true,
                visitor_message: "Thanks! Connecting you with our sales specialist right now.",
                internal_note: "Lead qualified by workflow. High intent detected in inquiry.",
              },
            },
            {
              id: "node_end_unmatched",
              type: "end",
              name: "End workflow",
              subtitle: "No action needed",
              position: { x: 680, y: 340 },
              config: { reason: "condition_not_matched" },
            },
          ],
          edges: [
            {
              id: "e1",
              source: "node_trig_lead",
              sourcePort: "received",
              target: "node_cond_intent",
              targetPort: "in",
            },
            {
              id: "e2",
              source: "node_cond_intent",
              sourcePort: "matched",
              target: "node_tag_lead",
              targetPort: "in",
              label: "Matched",
            },
            {
              id: "e3",
              source: "node_cond_intent",
              sourcePort: "not_matched",
              target: "node_end_unmatched",
              targetPort: "in",
              label: "Not matched",
            },
            {
              id: "e4",
              source: "node_tag_lead",
              sourcePort: "success",
              target: "node_handoff_sales",
              targetPort: "in",
            },
          ],
        },
      },
      {
        id: "human_handoff_ai_pause",
        name: "Human Handoff with AI Pause",
        category: "Support",
        description:
          "Escalate immediately when a customer requests a human agent, automatically pausing automated AI responses and alerting on-duty representatives.",
        trigger_event_type: "message.appended",
        badge: "Essential",
        steps_count: 4,
        graph: {
          schema_version: 1,
          entry_node_id: "node_trig_handoff",
          viewport: { x: 50, y: 100, zoom: 1 },
          nodes: [
            {
              id: "node_trig_handoff",
              type: "trigger",
              name: "Customer message",
              subtitle: "message.appended",
              position: { x: 80, y: 220 },
              config: {
                event_type: "message.appended",
                run_for: "visitor_messages",
                deduplicate_events: true,
              },
            },
            {
              id: "node_cond_agent_request",
              type: "condition",
              name: "Check human request",
              subtitle: "Matches human, representative, support",
              position: { x: 380, y: 220 },
              config: {
                root_group: {
                  id: "grp_handoff",
                  logic: "or",
                  rules: [
                    {
                      id: "r1",
                      field: "message.text",
                      operator: "contains",
                      value: "speak to human",
                    },
                    { id: "r2", field: "message.text", operator: "contains", value: "agent" },
                    {
                      id: "r3",
                      field: "message.text",
                      operator: "contains",
                      value: "representative",
                    },
                    {
                      id: "r4",
                      field: "message.text",
                      operator: "contains",
                      value: "support person",
                    },
                  ],
                },
                missing_value_behavior: "not_matched",
              },
            },
            {
              id: "node_handoff_tier1",
              type: "agent_handoff",
              name: "Handoff to Support",
              subtitle: "Queue: tier_1_support (AI paused)",
              position: { x: 680, y: 160 },
              config: {
                destination_type: "human",
                queue_id: "tier_1_support",
                priority: "normal",
                pause_ai_replies: true,
                visitor_message:
                  "I am placing you in the support queue. A representative will be with you shortly.",
                internal_note: "User requested human agent.",
              },
            },
            {
              id: "node_notify_team",
              type: "notification",
              name: "Notify Inbox Agents",
              subtitle: "inbox: #support-desk",
              position: { x: 960, y: 160 },
              config: {
                delivery: "inbox",
                recipients: ["support-team"],
                subject: "New customer escalation in queue",
                body: "Customer conversation {{event.conversation_id}} requires live assistance.",
              },
            },
            {
              id: "node_end_no_escalate",
              type: "end",
              name: "End workflow",
              subtitle: "Continue AI dialogue",
              position: { x: 680, y: 340 },
              config: { reason: "condition_not_matched" },
            },
          ],
          edges: [
            {
              id: "e1",
              source: "node_trig_handoff",
              sourcePort: "received",
              target: "node_cond_agent_request",
              targetPort: "in",
            },
            {
              id: "e2",
              source: "node_cond_agent_request",
              sourcePort: "matched",
              target: "node_handoff_tier1",
              targetPort: "in",
              label: "Matched",
            },
            {
              id: "e3",
              source: "node_cond_agent_request",
              sourcePort: "not_matched",
              target: "node_end_no_escalate",
              targetPort: "in",
              label: "Not matched",
            },
            {
              id: "e4",
              source: "node_handoff_tier1",
              sourcePort: "success",
              target: "node_notify_team",
              targetPort: "in",
            },
          ],
        },
      },
      {
        id: "vip_customer_escalation",
        name: "VIP Customer Escalation",
        category: "Customer Success",
        description:
          "Prioritize enterprise and VIP customer tickets automatically, post webhook alerts to management, and assign high priority.",
        trigger_event_type: "message.appended",
        badge: "Enterprise",
        steps_count: 4,
        graph: {
          schema_version: 1,
          entry_node_id: "node_trig_vip",
          viewport: { x: 50, y: 100, zoom: 1 },
          nodes: [
            {
              id: "node_trig_vip",
              type: "trigger",
              name: "Customer message",
              subtitle: "message.appended",
              position: { x: 80, y: 220 },
              config: { event_type: "message.appended", deduplicate_events: true },
            },
            {
              id: "node_cond_vip",
              type: "condition",
              name: "Check VIP status",
              subtitle: "tier == VIP or Enterprise",
              position: { x: 380, y: 220 },
              config: {
                root_group: {
                  id: "grp_vip",
                  logic: "or",
                  rules: [
                    { id: "r1", field: "customer.tier", operator: "equals", value: "VIP" },
                    { id: "r2", field: "customer.tier", operator: "equals", value: "Enterprise" },
                  ],
                },
              },
            },
            {
              id: "node_tag_vip",
              type: "update_tags",
              name: "Set VIP Tag",
              subtitle: "conversation: vip, urgent",
              position: { x: 680, y: 160 },
              config: {
                target_resource: "conversation",
                operation: "add",
                tags: ["vip", "priority-urgent"],
              },
            },
            {
              id: "node_handoff_vip",
              type: "agent_handoff",
              name: "Assign VIP Concierge",
              subtitle: "Queue: vip_concierge (Urgent)",
              position: { x: 960, y: 160 },
              config: {
                destination_type: "human",
                queue_id: "vip_concierge",
                priority: "urgent",
                pause_ai_replies: true,
                visitor_message:
                  "Welcome back! A dedicated account concierge has been assigned to your conversation.",
              },
            },
          ],
          edges: [
            {
              id: "e1",
              source: "node_trig_vip",
              sourcePort: "received",
              target: "node_cond_vip",
              targetPort: "in",
            },
            {
              id: "e2",
              source: "node_cond_vip",
              sourcePort: "matched",
              target: "node_tag_vip",
              targetPort: "in",
            },
            {
              id: "e3",
              source: "node_tag_vip",
              sourcePort: "success",
              target: "node_handoff_vip",
              targetPort: "in",
            },
          ],
        },
      },
      {
        id: "auto_close_csat_survey",
        name: "Auto-Close & CSAT Survey",
        category: "Resolution",
        description:
          "When a conversation is released/resolved by an agent, trigger an automated CSAT rating survey and record metrics.",
        trigger_event_type: "conversation.released",
        badge: "Analytics",
        steps_count: 3,
        graph: {
          schema_version: 1,
          entry_node_id: "node_trig_release",
          viewport: { x: 50, y: 100, zoom: 1 },
          nodes: [
            {
              id: "node_trig_release",
              type: "trigger",
              name: "Conversation resolved",
              subtitle: "conversation.released",
              position: { x: 80, y: 220 },
              config: { event_type: "conversation.released" },
            },
            {
              id: "node_webhook_csat",
              type: "webhook",
              name: "Dispatch CSAT Survey",
              subtitle: "POST /v1/surveys/dispatch",
              position: { x: 380, y: 220 },
              config: {
                method: "POST",
                url: "https://api.example.com/v1/surveys/dispatch",
                body: JSON.stringify(
                  { conversation_id: "{{event.conversation_id}}", type: "csat_standard" },
                  null,
                  2,
                ),
                auth_type: "none",
              },
            },
            {
              id: "node_tag_csat",
              type: "update_tags",
              name: "Tag survey sent",
              subtitle: "conversation: csat-survey-sent",
              position: { x: 680, y: 220 },
              config: {
                target_resource: "conversation",
                operation: "add",
                tags: ["csat-survey-sent"],
              },
            },
          ],
          edges: [
            {
              id: "e1",
              source: "node_trig_release",
              sourcePort: "received",
              target: "node_webhook_csat",
              targetPort: "in",
            },
            {
              id: "e2",
              source: "node_webhook_csat",
              sourcePort: "success",
              target: "node_tag_csat",
              targetPort: "in",
            },
          ],
        },
      },
      {
        id: "after_hours_responder",
        name: "After-Hours Auto-Responder",
        category: "Operations",
        description:
          "Send an automated notice to visitors during off-hours, create a follow-up ticket in Zendesk, and notify the morning shift.",
        trigger_event_type: "message.appended",
        badge: "Schedule",
        steps_count: 4,
        graph: {
          schema_version: 1,
          entry_node_id: "node_trig_msg",
          viewport: { x: 50, y: 100, zoom: 1 },
          nodes: [
            {
              id: "node_trig_msg",
              type: "trigger",
              name: "Visitor message",
              subtitle: "message.appended",
              position: { x: 80, y: 220 },
              config: { event_type: "message.appended" },
            },
            {
              id: "node_cond_hours",
              type: "condition",
              name: "Outside business hours",
              subtitle: "Check business schedule",
              position: { x: 380, y: 220 },
              config: {
                root_group: {
                  id: "grp_hours",
                  logic: "and",
                  rules: [
                    { id: "r1", field: "event.outside_hours", operator: "equals", value: "true" },
                  ],
                },
              },
            },
            {
              id: "node_email_duty",
              type: "notification",
              name: "Email duty manager",
              subtitle: "email: ops-oncall@quickstart.ai",
              position: { x: 680, y: 160 },
              config: {
                delivery: "email",
                recipients: ["ops-oncall@quickstart.ai"],
                subject: "After-hours inquiry received",
                body: "A message was received outside business hours for conversation {{event.conversation_id}}.",
              },
            },
          ],
          edges: [
            {
              id: "e1",
              source: "node_trig_msg",
              sourcePort: "received",
              target: "node_cond_hours",
              targetPort: "in",
            },
            {
              id: "e2",
              source: "node_cond_hours",
              sourcePort: "matched",
              target: "node_email_duty",
              targetPort: "in",
            },
          ],
        },
      },
      {
        id: "webhook_sync_crm",
        name: "Webhook Sync to External CRM",
        category: "Integrations",
        description:
          "Sync contact details and chat events in real-time to external endpoints (Salesforce, HubSpot, Zapier, or custom backends).",
        trigger_event_type: "message.appended",
        badge: "Webhook",
        steps_count: 3,
        graph: {
          schema_version: 1,
          entry_node_id: "node_trig_sync",
          viewport: { x: 50, y: 100, zoom: 1 },
          nodes: [
            {
              id: "node_trig_sync",
              type: "trigger",
              name: "Visitor event",
              subtitle: "message.appended",
              position: { x: 80, y: 220 },
              config: { event_type: "message.appended" },
            },
            {
              id: "node_webhook_sync",
              type: "webhook",
              name: "POST to External CRM",
              subtitle: "POST https://crm.example.com/api/v1/sync",
              position: { x: 380, y: 220 },
              config: {
                method: "POST",
                url: "https://crm.example.com/api/v1/sync",
                body: JSON.stringify(
                  {
                    conversation_id: "{{event.conversation_id}}",
                    message: "{{event.message.text}}",
                    timestamp: "{{event.timestamp}}",
                  },
                  null,
                  2,
                ),
                auth_type: "bearer",
              },
            },
            {
              id: "node_log_sync",
              type: "log",
              name: "Audit sync log",
              subtitle: "level: INFO",
              position: { x: 680, y: 220 },
              config: {
                level: "info",
                message: "Synced event to CRM for conversation {{event.conversation_id}}",
              },
            },
          ],
          edges: [
            {
              id: "e1",
              source: "node_trig_sync",
              sourcePort: "received",
              target: "node_webhook_sync",
              targetPort: "in",
            },
            {
              id: "e2",
              source: "node_webhook_sync",
              sourcePort: "success",
              target: "node_log_sync",
              targetPort: "in",
            },
          ],
        },
      },
    ];
  }

  private async assertActiveCap(workspaceId: string): Promise<void> {
    const count = await this.repo.countActive(workspaceId);
    if (count >= this.maxActivePerWorkspace) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Workspace may have at most ${this.maxActivePerWorkspace} active workflows`,
      });
    }
  }
}

function normalizeActions(actions: WorkflowAction[]): WorkflowAction[] {
  if (!Array.isArray(actions)) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "actions must be an array" });
  }
  return actions.map((action, index) => {
    if (!action || typeof action !== "object") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `actions[${index}] is invalid`,
      });
    }
    if (!action.id || !ACTION_KINDS.has(action.kind)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `actions[${index}] requires id and a supported kind`,
      });
    }
    return {
      id: String(action.id),
      kind: action.kind,
      displayName: action.displayName || action.kind,
      config: action.config && typeof action.config === "object" ? action.config : {},
    };
  });
}

function checkSettings(settings: WorkflowSettings | undefined) {
  if (settings === undefined) return;
  if (
    !settings ||
    typeof settings !== "object" ||
    !Number.isInteger(settings.max_run_duration_seconds) ||
    settings.max_run_duration_seconds < 1 ||
    settings.max_run_duration_seconds > 300 ||
    !Number.isInteger(settings.concurrent_runs) ||
    settings.concurrent_runs < 1 ||
    settings.concurrent_runs > 20 ||
    typeof settings.timezone !== "string" ||
    !settings.retry_policy ||
    !Number.isInteger(settings.retry_policy.max_attempts) ||
    settings.retry_policy.max_attempts < 1 ||
    settings.retry_policy.max_attempts > 3
  )
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "Invalid workflow settings or limits",
    });
  try {
    new Intl.DateTimeFormat("en", { timeZone: settings.timezone });
  } catch {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid workflow timezone" });
  }
}
