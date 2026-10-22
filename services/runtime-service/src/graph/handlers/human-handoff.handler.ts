import type { AgentGraphNode, HumanHandoffNodeConfig } from "@quickstart/contracts";
import type { ExecutionContext, GraphNodeHandler, NodeExecutionResult } from "../types.js";
import { interpolateTemplate } from "../eval-utils.js";
import type { ConversationClient } from "../../clients/conversation.client.js";

export class HumanHandoffHandler implements GraphNodeHandler<"human_handoff"> {
  type = "human_handoff" as const;

  constructor(_conversationClient?: ConversationClient) {}

  async execute(
    node: AgentGraphNode<"human_handoff">,
    ctx: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.config as HumanHandoffNodeConfig;
    const variables = ctx.sessionState.variables || {};

    const handoffMessage =
      ctx.channel === "voice"
        ? config.message_voice || "Connecting you with our reception team now. Please hold on."
        : config.message_chat ||
          "I'll connect you with our team now. You can leave any extra details here while you wait.";

    const interpolatedMessage = interpolateTemplate(handoffMessage, variables);

    if (ctx.onAssistantMessage) {
      await ctx.onAssistantMessage(interpolatedMessage);
    }

    if (!ctx.isPreview) {
      if (!ctx.onHandoff) return { status: "failed", error: "Operator handoff is unavailable." };
      await ctx.onHandoff();
    }
    ctx.sessionState.status = "handed_off";
    ctx.sessionState.handoff_state = {
      original_node_id: node.id,
      resume_target_node_id:
        config.resume_node_id ??
        ctx.graph.edges.find((e) => e.source === node.id && e.source_port === "resumed")?.target,
      handed_off_at: new Date().toISOString(),
      note: interpolateTemplate(config.handoff_note_template, variables),
    };

    return {
      status: "handed_off",
      chosenBranchPort: "resumed",
      assistantMessage: interpolatedMessage,
    };
  }
}
