import React from "react";
import type { NodeTypes } from "@xyflow/react";
import type { GraphNodeType, NodeConfigMap } from "@quickstart/contracts";
import {
  LogIn,
  Sparkles,
  MessageSquareText,
  GitFork,
  GitBranch,
  Cpu,
  Globe,
  BookOpen,
  MessageSquareShare,
  UserCheck,
  PhoneOff,
} from "lucide-react";

import { EntrypointNode } from "../components/nodes/entrypoint-node";
import { WelcomeNode } from "../components/nodes/welcome-node";
import { ConversationNode } from "../components/nodes/conversation-node";
import { IntentRouterNode } from "../components/nodes/intent-router-node";
import { ConditionNode } from "../components/nodes/condition-node";
import { AiPromptNode } from "../components/nodes/ai-prompt-node";
import { HttpRequestNode } from "../components/nodes/http-request-node";
import { KnowledgeSearchNode } from "../components/nodes/knowledge-search-node";
import { ResponseNode } from "../components/nodes/response-node";
import { HumanHandoffNode } from "../components/nodes/human-handoff-node";
import { EndConversationNode } from "../components/nodes/end-conversation-node";

export const CANVAS_NODE_TYPES: NodeTypes = {
  entrypoint: EntrypointNode,
  welcome: WelcomeNode,
  conversation: ConversationNode,
  intent_router: IntentRouterNode,
  condition: ConditionNode,
  ai_prompt: AiPromptNode,
  http_request: HttpRequestNode,
  knowledge_search: KnowledgeSearchNode,
  response: ResponseNode,
  human_handoff: HumanHandoffNode,
  end_conversation: EndConversationNode,
};

export type NodeCategory = "Entry" | "Conversation" | "Logic" | "Actions";

export type NodeDefinition<T extends GraphNodeType = GraphNodeType> = {
  type: T;
  category: NodeCategory;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  defaultConfig: NodeConfigMap[T];
};

export const NODE_REGISTRY: Record<GraphNodeType, NodeDefinition<any>> = {
  entrypoint: {
    type: "entrypoint",
    category: "Entry",
    name: "Incoming interaction",
    description: "Inbound trigger receiving chat, voice, or webhook interactions.",
    icon: LogIn,
    iconBgColor: "bg-blue-50 text-[#2A6DFB]",
    defaultConfig: {
      allowed_channels: ["chat", "voice"],
      visitor_metadata_fields: [],
    },
  },
  welcome: {
    type: "welcome",
    category: "Conversation",
    name: "Welcome",
    description: "Initial message to open conversation with visitors.",
    icon: Sparkles,
    iconBgColor: "bg-purple-50 text-[#9061FF]",
    defaultConfig: {
      message_mode: "fixed",
      fixed_text: "Hello! How can I assist you today?",
      transition: "wait_for_input",
    },
  },
  conversation: {
    type: "conversation",
    category: "Conversation",
    name: "Conversation",
    description: "Engage in multi-turn dialogue to collect structured visitor fields.",
    icon: MessageSquareText,
    iconBgColor: "bg-purple-50 text-[#9061FF]",
    defaultConfig: {
      instructions: "Politely collect required information from the visitor.",
      capture_fields: [],
      completion_condition: "all_required_captured",
      max_turns: 4,
    },
  },
  intent_router: {
    type: "intent_router",
    category: "Logic",
    name: "Intent router",
    description: "Route dialogue flow by AI classification or keyword rules.",
    icon: GitFork,
    iconBgColor: "bg-amber-50 text-[#ECB730]",
    defaultConfig: {
      mode: "ai_intent",
      branches: [
        { id: "branch_1", name: "Inquiry", description: "General questions" },
        { id: "branch_2", name: "Support", description: "Technical help or issues" },
      ],
      fallback_branch_id: "branch_1",
    },
  },
  condition: {
    type: "condition",
    category: "Logic",
    name: "Condition",
    description: "Branch based on boolean logic, variables, and metadata values.",
    icon: GitBranch,
    iconBgColor: "bg-amber-50 text-[#ECB730]",
    defaultConfig: {
      logical_operator: "AND",
      rules: [],
      missing_value_behavior: "evaluate_false",
    },
  },
  ai_prompt: {
    type: "ai_prompt",
    category: "Conversation",
    name: "AI & Prompt",
    description: "Generate responses, extract insights, or summarize context with LLMs.",
    icon: Cpu,
    iconBgColor: "bg-indigo-50 text-indigo-600",
    defaultConfig: {
      model_profile: "",
      system_prompt: "",
      context_variables: [],
      temperature: 0.3,
      output_variable: "ai_output",
    },
  },
  http_request: {
    type: "http_request",
    category: "Actions",
    name: "HTTP request",
    description: "Execute authenticated API actions or custom workspace tools.",
    icon: Globe,
    iconBgColor: "bg-orange-50 text-[#FA5D19]",
    defaultConfig: {
      tool_id: "",
      method: "POST",
      url: "",
      parameter_mappings: {},
      require_confirmation: false,
      output_variable: "tool_result",
    },
  },
  knowledge_search: {
    type: "knowledge_search",
    category: "Actions",
    name: "Knowledge search",
    description: "Query workspace documents and retrieve verified reference passages.",
    icon: BookOpen,
    iconBgColor: "bg-blue-50 text-[#2A6DFB]",
    defaultConfig: {
      source_ids: [],
      query_variable: "visitor.message",
      max_results: 3,
      output_variable: "search_context",
    },
  },
  response: {
    type: "response",
    category: "Conversation",
    name: "Response",
    description: "Send a Markdown chat message or spoken voice audio to the visitor.",
    icon: MessageSquareShare,
    iconBgColor: "bg-purple-50 text-[#9061FF]",
    defaultConfig: {
      content_type: "fixed_text",
      fixed_text: "",
      wait_for_visitor: false,
      allow_markdown: true,
    },
  },
  human_handoff: {
    type: "human_handoff",
    category: "Actions",
    name: "Human handoff",
    description: "Transfer live conversation to human operators in the inbox.",
    icon: UserCheck,
    iconBgColor: "bg-emerald-50 text-emerald-600",
    defaultConfig: {
      handoff_message: "Transferring you to a human teammate. Please wait...",
      queue_name: "default",
      pause_ai: true,
      resume_rule: "on_operator_release",
    },
  },
  end_conversation: {
    type: "end_conversation",
    category: "Actions",
    name: "End conversation",
    description: "Conclude and archive the session gracefully.",
    icon: PhoneOff,
    iconBgColor: "bg-red-50 text-red-600",
    defaultConfig: {
      closing_message: "Thank you for reaching out. Goodbye!",
      voice_behavior: "graceful_hangup",
      chat_behavior: "archive_session",
    },
  },
};

export const NODE_CATEGORIES: NodeCategory[] = ["Entry", "Conversation", "Logic", "Actions"];
