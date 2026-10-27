import type { AgentGraph, AgentGraphEdge, AgentGraphNode } from "./agent-graph.js";

export type DefaultAgentGraphChannels = {
  chat: boolean;
  voice: boolean;
};

/**
 * Creates the shared baseline flow used when a legacy/manual agent is opened in
 * Canvas. The agent's global instructions remain in the agent draft settings;
 * the AI node deliberately inherits them instead of copying the text.
 */
export function createDefaultAgentGraph(
  channels: DefaultAgentGraphChannels = { chat: true, voice: false },
): AgentGraph {
  const entryId = "manual_entry";
  const knowledgeId = "manual_knowledge";
  const aiId = "manual_ai";
  const responseId = "manual_response";

  const nodes: AgentGraphNode[] = [
    {
      id: entryId,
      type: "entrypoint",
      name: "Incoming interaction",
      position: { x: 80, y: 240 },
      config: {
        allowed_channels: [
          ...(channels.chat ? ["chat"] : []),
          ...(channels.voice ? ["voice"] : []),
        ],
        visitor_metadata_fields: [],
      },
      presentation: {
        notes: "Generated from the manual agent editor.",
      },
    },
    {
      id: knowledgeId,
      type: "knowledge_search",
      name: "Search workspace knowledge",
      position: { x: 380, y: 240 },
      config: {
        use_all_sources: true,
        query_variable: "visitor.message",
        max_results: 5,
        search_method: "hybrid",
        output_variable: "search_context",
      },
      presentation: {
        notes: "Uses the same knowledge settings as the manual agent.",
      },
    },
    {
      id: aiId,
      type: "ai_prompt",
      name: "Use agent instructions",
      position: { x: 720, y: 240 },
      config: {
        system_prompt: "",
        inherit_agent_instructions: true,
        context_variables: ["search_context", "visitor.message"],
        temperature: 0.3,
        output_variable: "ai_output",
      },
      presentation: {
        notes: "This node inherits the shared global instructions from the manual editor.",
      },
    },
    {
      id: responseId,
      type: "response",
      name: "Send response",
      position: { x: 1060, y: 240 },
      config: {
        content_type: "variable_reference",
        variable_name: "ai_output",
        wait_for_visitor: true,
        allow_markdown: true,
      },
    },
  ];

  const edge = (
    id: string,
    source: string,
    source_port: string,
    target: string,
  ): AgentGraphEdge => ({
    id,
    source,
    source_port,
    target,
    target_port: "in",
  });

  return {
    schema_version: 1,
    entry_node_id: entryId,
    nodes,
    edges: [
      edge("manual_entry_to_knowledge", entryId, "interaction_received", knowledgeId),
      edge("manual_knowledge_found", knowledgeId, "results_found", aiId),
      edge("manual_knowledge_empty", knowledgeId, "no_matches", aiId),
      edge("manual_knowledge_failure", knowledgeId, "failure", aiId),
      edge("manual_ai_success", aiId, "success", responseId),
      edge("manual_ai_failure", aiId, "failure", responseId),
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}
