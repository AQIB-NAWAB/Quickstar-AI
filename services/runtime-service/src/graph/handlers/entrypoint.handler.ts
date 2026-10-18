import type { AgentGraphNode, EntrypointNodeConfig } from "@quickstart/contracts";
import type { ExecutionContext, GraphNodeHandler, NodeExecutionResult } from "../types.js";

export class EntrypointHandler implements GraphNodeHandler<"entrypoint"> {
  type = "entrypoint" as const;

  async execute(
    node: AgentGraphNode<"entrypoint">,
    ctx: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.config as EntrypointNodeConfig;
    if (config.allowed_channels?.length && !config.allowed_channels.includes(ctx.channel))
      return { status: "failed", error: "This entrypoint does not support the incoming channel." };
    const outputVariables: Record<string, unknown> = {
      conversation: {
        channel: ctx.channel,
        session_id: ctx.sessionId,
        is_preview: ctx.isPreview,
      },
      visitor: {
        ...(ctx.sessionState.variables.visitor &&
        typeof ctx.sessionState.variables.visitor === "object"
          ? ctx.sessionState.variables.visitor
          : {}),
        message: ctx.visitorMessage ?? "",
      },
    };

    if (Array.isArray(config.visitor_fields)) {
      for (const field of config.visitor_fields) {
        if (field.variable) {
          const val = ctx.sessionState.variables?.[field.variable];
          if (val !== undefined) {
            outputVariables[field.variable] = val;
          }
        }
      }
    }

    return {
      status: "succeeded",
      chosenBranchPort: "interaction_received",
      outputVariables,
    };
  }
}
