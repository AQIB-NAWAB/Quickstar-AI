import type { AgentGraphNode, ResponseNodeConfig } from "@quickstart/contracts";
import type { ExecutionContext, GraphNodeHandler, NodeExecutionResult } from "../types.js";
import { interpolateTemplate, resolveVariablePath } from "../eval-utils.js";
import { sanitizeSpokenOutput } from "../../services/turns.service.js";

export class ResponseHandler implements GraphNodeHandler<"response"> {
  type = "response" as const;

  async execute(
    node: AgentGraphNode<"response">,
    ctx: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.config as ResponseNodeConfig;
    const variables = ctx.sessionState.variables || {};

    let responseText = "";

    if (config.response_mode === "fixed_message" && config.message) {
      responseText = interpolateTemplate(config.message, variables);
    } else if (config.context_variables && config.context_variables.length > 0) {
      // Pick the first available context variable (e.g. answer.text or slots.results)
      for (const varName of config.context_variables) {
        const val = resolveVariablePath(varName, variables);
        if (val !== undefined && val !== null) {
          if (typeof val === "object") {
            // Structured context must be composed by an AI node, never dumped to visitors.
            return {
              status: "failed",
              chosenBranchPort: "failure",
              error: "Select a text output from an AI node or use a fixed message.",
            };
          } else {
            responseText = String(val);
          }
          break;
        }
      }
    }

    if (!responseText) {
      return {
        status: "failed",
        error: "No response text is available. Configure a message or text context.",
      };
    }

    // Voice sanitization if on voice channel
    if (ctx.channel === "voice") {
      responseText = sanitizeSpokenOutput(responseText);
    }

    if (ctx.onAssistantMessage) {
      await ctx.onAssistantMessage(responseText);
    }

    if (config.after_responding === "wait_for_visitor") {
      return {
        status: "waiting_for_input",
        chosenBranchPort: "message_sent",
        resumeAtNextNode: true,
        assistantMessage: responseText,
      };
    }

    return {
      status: "succeeded",
      chosenBranchPort: "message_sent",
      assistantMessage: responseText,
    };
  }
}
