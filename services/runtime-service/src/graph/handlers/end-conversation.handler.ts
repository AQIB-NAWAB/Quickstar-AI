import type { AgentGraphNode, EndConversationNodeConfig } from "@quickstart/contracts";
import type { ExecutionContext, GraphNodeHandler, NodeExecutionResult } from "../types.js";
import { interpolateTemplate } from "../eval-utils.js";
import { sanitizeSpokenOutput } from "../../services/turns.service.js";

export class EndConversationHandler implements GraphNodeHandler<"end_conversation"> {
  type = "end_conversation" as const;

  async execute(
    node: AgentGraphNode<"end_conversation">,
    ctx: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.config as EndConversationNodeConfig;
    const variables = ctx.sessionState.variables || {};

    let closingText = "";
    if (config.closing_message_enabled) {
      const template =
        ctx.channel === "voice"
          ? config.closing_message_voice || "Thank you for contacting us. Have a great day!"
          : config.closing_message_chat || "Thank you for contacting us. Have a great day!";

      closingText = interpolateTemplate(template, variables);
      if (ctx.channel === "voice") {
        closingText = sanitizeSpokenOutput(closingText);
      }

      if (ctx.onAssistantMessage && closingText) {
        await ctx.onAssistantMessage(closingText);
      }
    }

    return {
      status: "completed",
      assistantMessage: closingText,
    };
  }
}
