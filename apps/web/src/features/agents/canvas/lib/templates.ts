import type { AgentGraph } from "@quickstart/contracts";

export type StarterTemplate = {
  id: string;
  name: string;
  description: string;
  badge?: string;
  graph: AgentGraph;
};

export const BLANK_GRAPH: AgentGraph = {
  schema_version: 1,
  entry_node_id: "node_entry",
  nodes: [
    {
      id: "node_entry",
      type: "entrypoint",
      name: "Start Interaction",
      position: { x: 120, y: 240 },
      config: {
        allowed_channels: ["chat", "voice"],
        visitor_metadata_fields: [],
      },
    },
  ],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const APPOINTMENT_ASSISTANT_TEMPLATE: StarterTemplate = {
  id: "appointment-assistant",
  name: "Appointment Assistant",
  description:
    "Greet visitors, collect booking parameters, check slot availability, and confirm reservations.",
  badge: "Booking",
  graph: {
    schema_version: 1,
    entry_node_id: "entry_1",
    nodes: [
      {
        id: "entry_1",
        type: "entrypoint",
        name: "Entry Point",
        position: { x: 80, y: 220 },
        config: {
          allowed_channels: ["chat", "voice"],
          visitor_metadata_fields: ["customer_id", "phone_number"],
        },
      },
      {
        id: "welcome_1",
        type: "welcome",
        name: "Welcome Greeting",
        position: { x: 380, y: 220 },
        config: {
          message_mode: "fixed",
          fixed_text:
            "Hello! Welcome to our clinic. I can help you schedule, check, or change an appointment.",
          transition: "wait_for_input",
        },
      },
      {
        id: "conv_capture",
        type: "conversation",
        name: "Collect Details",
        position: { x: 680, y: 200 },
        config: {
          instructions:
            "Politely collect the patient's full name, preferred date, and the reason for the appointment.",
          capture_fields: [
            {
              field_name: "patient_name",
              type: "text",
              required: true,
              description: "Full legal name",
            },
            {
              field_name: "preferred_date",
              type: "date",
              required: true,
              description: "Desired appointment date",
            },
            {
              field_name: "service_type",
              type: "text",
              required: false,
              description: "General checkup or consultation",
            },
          ],
          completion_condition: "all_required_captured",
          max_turns: 4,
        },
      },
      {
        id: "action_check",
        type: "http_request",
        name: "Check Availability",
        position: { x: 1000, y: 200 },
        config: {
          // Unconfigured - user must pick a real workspace tool
          tool_id: "",
          method: "POST",
          url: "",
          parameter_mappings: {
            date: "preferred_date",
            service: "service_type",
          },
          require_confirmation: true,
          confirmation_prompt:
            "Shall I go ahead and book {{ service_type }} on {{ preferred_date }} for {{ patient_name }}?",
          output_variable: "booking_result",
        },
      },
      {
        id: "response_confirm",
        type: "response",
        name: "Booking result",
        position: { x: 1320, y: 160 },
        config: {
          content_type: "fixed_text",
          fixed_text:
            "Thank you, {{ patient_name }}! Your appointment request has been received. The connected service returned: {{ booking_result.status }}.",
          wait_for_visitor: false,
          allow_markdown: true,
        },
      },
      {
        id: "end_flow",
        type: "end_conversation",
        name: "End Conversation",
        position: { x: 1640, y: 220 },
        config: {
          closing_message: "Thank you for reaching out to us. Have a wonderful and healthy day!",
          voice_behavior: "graceful_hangup",
          chat_behavior: "archive_session",
        },
      },
    ],
    edges: [
      {
        id: "e_entry_welcome",
        source_node_id: "entry_1",
        source_port_id: "out",
        target_node_id: "welcome_1",
        target_port_id: "in",
      },
      {
        id: "e_welcome_conv",
        source_node_id: "welcome_1",
        source_port_id: "out",
        target_node_id: "conv_capture",
        target_port_id: "in",
      },
      {
        id: "e_conv_action",
        source_node_id: "conv_capture",
        source_port_id: "out_completed",
        target_node_id: "action_check",
        target_port_id: "in",
      },
      {
        id: "e_action_confirm",
        source_node_id: "action_check",
        source_port_id: "out_success",
        target_node_id: "response_confirm",
        target_port_id: "in",
      },
      {
        id: "e_confirm_end",
        source_node_id: "response_confirm",
        source_port_id: "out",
        target_node_id: "end_flow",
        target_port_id: "in",
      },
    ],
    viewport: { x: 0, y: 0, zoom: 0.9 },
  },
};

export const KNOWLEDGE_ASSISTANT_TEMPLATE: StarterTemplate = {
  id: "knowledge-assistant",
  name: "Knowledge Assistant",
  description:
    "Search workspace documents and knowledge bases, classify intent, and provide verified answers.",
  badge: "Support & FAQ",
  graph: {
    schema_version: 1,
    entry_node_id: "entry_1",
    nodes: [
      {
        id: "entry_1",
        type: "entrypoint",
        name: "Customer Entry",
        position: { x: 80, y: 260 },
        config: {
          allowed_channels: ["chat", "voice"],
          visitor_metadata_fields: [],
        },
      },
      {
        id: "welcome_1",
        type: "welcome",
        name: "Welcome",
        position: { x: 380, y: 260 },
        config: {
          message_mode: "fixed",
          fixed_text:
            "Welcome! I am your AI knowledge assistant. Ask me anything about our services, pricing, or procedures.",
          transition: "wait_for_input",
        },
      },
      {
        id: "intent_1",
        type: "intent_router",
        name: "Classify Question",
        position: { x: 680, y: 240 },
        config: {
          mode: "ai_intent",
          branches: [
            {
              id: "b_faq",
              name: "General FAQ",
              description: "Questions about company, products, hours, pricing",
            },
            {
              id: "b_human",
              name: "Speak with Teammate",
              description: "Requests to talk to an operator or human",
            },
          ],
          fallback_branch_id: "b_faq",
        },
      },
      {
        id: "kb_search",
        type: "knowledge_search",
        name: "Search Workspace Knowledge",
        position: { x: 1020, y: 160 },
        config: {
          source_ids: [], // Unconfigured - user selects workspace sources
          query_variable: "visitor_message",
          max_results: 4,
          output_variable: "search_context",
        },
      },
      {
        id: "ai_answer",
        type: "ai_prompt",
        name: "Draft Verified Answer",
        position: { x: 1340, y: 160 },
        config: {
          model_profile: "openai:gpt-4o",
          system_prompt:
            "You are a helpful and concise support agent. Answer the question using ONLY the provided knowledge context. If the answer is not in the context, politely state you do not have that information.",
          context_variables: ["search_context", "visitor_message"],
          temperature: 0.2,
          output_variable: "ai_reply",
        },
      },
      {
        id: "resp_answer",
        type: "response",
        name: "Send Answer",
        position: { x: 1660, y: 160 },
        config: {
          content_type: "variable_reference",
          variable_name: "ai_reply",
          wait_for_visitor: true,
          allow_markdown: true,
        },
      },
      {
        id: "handoff_human",
        type: "human_handoff",
        name: "Transfer to Teammate",
        position: { x: 1020, y: 400 },
        config: {
          handoff_message:
            "I am connecting you with one of our human teammates right now. Please hold on.",
          queue_name: "general_support",
          pause_ai: true,
          resume_rule: "on_operator_release",
        },
      },
    ],
    edges: [
      {
        id: "e1",
        source_node_id: "entry_1",
        source_port_id: "out",
        target_node_id: "welcome_1",
        target_port_id: "in",
      },
      {
        id: "e2",
        source_node_id: "welcome_1",
        source_port_id: "out",
        target_node_id: "intent_1",
        target_port_id: "in",
      },
      {
        id: "e3",
        source_node_id: "intent_1",
        source_port_id: "b_faq",
        target_node_id: "kb_search",
        target_port_id: "in",
      },
      {
        id: "e4",
        source_node_id: "intent_1",
        source_port_id: "b_human",
        target_node_id: "handoff_human",
        target_port_id: "in",
      },
      {
        id: "e5",
        source_node_id: "kb_search",
        source_port_id: "out_found",
        target_node_id: "ai_answer",
        target_port_id: "in",
      },
      {
        id: "e6",
        source_node_id: "ai_answer",
        source_port_id: "out_success",
        target_node_id: "resp_answer",
        target_port_id: "in",
      },
    ],
    viewport: { x: 0, y: 0, zoom: 0.85 },
  },
};

export const SUPPORT_HANDOFF_TEMPLATE: StarterTemplate = {
  id: "support-handoff",
  name: "Support & Handoff",
  description:
    "Triage inbound customer issues with conditions, offer quick self-service answers, or smoothly escalate to human operators.",
  badge: "Triage",
  graph: {
    schema_version: 1,
    entry_node_id: "entry_1",
    nodes: [
      {
        id: "entry_1",
        type: "entrypoint",
        name: "Support Request",
        position: { x: 80, y: 260 },
        config: {
          allowed_channels: ["chat", "voice"],
          visitor_metadata_fields: ["account_tier", "email"],
        },
      },
      {
        id: "welcome_1",
        type: "welcome",
        name: "Welcome",
        position: { x: 380, y: 260 },
        config: {
          message_mode: "fixed",
          fixed_text:
            "Hello! Thanks for reaching out to support. What can we assist you with today?",
          transition: "wait_for_input",
        },
      },
      {
        id: "cond_tier",
        type: "condition",
        name: "VIP Tier Check",
        position: { x: 680, y: 240 },
        config: {
          logical_operator: "OR",
          rules: [
            { field: "account_tier", operator: "equals", value: "enterprise" },
            { field: "account_tier", operator: "equals", value: "vip" },
          ],
          missing_value_behavior: "evaluate_false",
        },
      },
      {
        id: "handoff_vip",
        type: "human_handoff",
        name: "Direct Escalation",
        position: { x: 1040, y: 140 },
        config: {
          handoff_message:
            "Connecting you directly with your dedicated enterprise support specialist.",
          queue_name: "enterprise_priority",
          pause_ai: true,
          resume_rule: "on_operator_release",
        },
      },
      {
        id: "conv_triage",
        type: "conversation",
        name: "Standard Triage",
        position: { x: 1040, y: 340 },
        config: {
          instructions:
            "Gather issue details and categorize the problem before offering suggestions.",
          capture_fields: [
            {
              field_name: "issue_category",
              type: "text",
              required: true,
              description: "Billing, Bug, or Feature",
            },
            {
              field_name: "issue_summary",
              type: "text",
              required: true,
              description: "Short description of the problem",
            },
          ],
          completion_condition: "all_required_captured",
          max_turns: 3,
        },
      },
      {
        id: "resp_guidance",
        type: "response",
        name: "Self-Service Guidance",
        position: { x: 1380, y: 340 },
        config: {
          content_type: "fixed_text",
          fixed_text:
            "Thank you for the information. We've logged ticket for '{{ issue_category }}': {{ issue_summary }}. Our support docs at help.quickstart.ai have immediate steps, and an agent will reply within 2 business hours.",
          wait_for_visitor: false,
          allow_markdown: true,
        },
      },
    ],
    edges: [
      {
        id: "e1",
        source_node_id: "entry_1",
        source_port_id: "out",
        target_node_id: "welcome_1",
        target_port_id: "in",
      },
      {
        id: "e2",
        source_node_id: "welcome_1",
        source_port_id: "out",
        target_node_id: "cond_tier",
        target_port_id: "in",
      },
      {
        id: "e3",
        source_node_id: "cond_tier",
        source_port_id: "out_match",
        target_node_id: "handoff_vip",
        target_port_id: "in",
      },
      {
        id: "e4",
        source_node_id: "cond_tier",
        source_port_id: "out_otherwise",
        target_node_id: "conv_triage",
        target_port_id: "in",
      },
      {
        id: "e5",
        source_node_id: "conv_triage",
        source_port_id: "out_completed",
        target_node_id: "resp_guidance",
        target_port_id: "in",
      },
    ],
    viewport: { x: 0, y: 0, zoom: 0.85 },
  },
};

export const STARTER_TEMPLATES: StarterTemplate[] = [
  APPOINTMENT_ASSISTANT_TEMPLATE,
  KNOWLEDGE_ASSISTANT_TEMPLATE,
  SUPPORT_HANDOFF_TEMPLATE,
];
