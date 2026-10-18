import type { AgentGraphNode, WelcomeNodeConfig } from "@quickstart/contracts";
import type { ExecutionContext, GraphNodeHandler, NodeExecutionResult } from "../types.js";
import { interpolateTemplate } from "../eval-utils.js";

export class WelcomeHandler implements GraphNodeHandler<"welcome"> {
  type = "welcome" as const;

  async execute(
    node: AgentGraphNode<"welcome">,
    ctx: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.config as WelcomeNodeConfig;
    const variables = ctx.sessionState.variables || {};

    const welcomeText = interpolateTemplate(
      config.message ?? config.fixed_text ?? "Welcome! How can I help you?",
      variables,
    );

    if (ctx.onAssistantMessage) {
      await ctx.onAssistantMessage(welcomeText);
    }

    if (config.after_mode === "wait") {
      return {
        status: "waiting_for_input",
        chosenBranchPort: "message_sent",
        resumeAtNextNode: true,
        assistantMessage: welcomeText,
      };
    }

    return {
      status: "succeeded",
      chosenBranchPort: "message_sent",
      assistantMessage: welcomeText,
    };
  }
}
