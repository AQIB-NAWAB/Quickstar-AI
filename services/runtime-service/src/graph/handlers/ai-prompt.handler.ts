import { graphModel } from "../model-reference.js";
import type { AgentGraphNode, AiPromptNodeConfig } from "@quickstart/contracts";
import type { ExecutionContext, GraphNodeHandler, NodeExecutionResult } from "../types.js";
import { resolveVariablePath, setVariablePath } from "../eval-utils.js";
import type { ModelGatewayClient } from "../../clients/model-gateway.client.js";

export class AiPromptHandler implements GraphNodeHandler<"ai_prompt"> {
  type = "ai_prompt" as const;

  constructor(private readonly modelGateway?: ModelGatewayClient) {}

  async execute(
    node: AgentGraphNode<"ai_prompt">,
    ctx: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.config as AiPromptNodeConfig;
    const variables = ctx.sessionState.variables || {};

    // Gather context variables
    const contextFragments: string[] = [];
    if (Array.isArray(config.context_variables)) {
      for (const varName of config.context_variables) {
        const val = resolveVariablePath(varName, variables);
        if (val !== undefined && val !== null) {
          contextFragments.push(
            `Context (${varName}):\n${typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}`,
          );
        }
      }
    }

    const contextText = contextFragments.length > 0 ? contextFragments.join("\n\n") : "";
    const inheritedInstructions =
      config.inherit_agent_instructions !== false
        ? (ctx.sessionState.agent_defaults?.instructions ?? "")
        : "";
    const systemPrompt =
      `${inheritedInstructions}\n\n${config.instructions ?? ""}\n\n${contextText}`.trim();
    const userMessage = ctx.visitorMessage || "Please assist the user.";

    if (this.modelGateway) {
      try {
        const defaults = ctx.sessionState.agent_defaults?.model_settings ?? {};
        const maxTokens = config.model_override?.max_tokens ?? Number(defaults.max_tokens ?? 220);
        const temperature =
          config.model_override?.temperature ??
          config.temperature ??
          Number(defaults.temperature ?? 0.3);

        const resp = await this.modelGateway.complete(
          {
            workspace_id: ctx.workspaceId,
            request_id: ctx.requestId,
            agent_id: ctx.agentId,
            conversation_id: ctx.conversationId,
            channel: ctx.channel,
            model: graphModel(ctx, config.model_override, config.model_profile),
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            max_tokens: maxTokens,
            temperature,
          },
          ctx.abortSignal,
        );

        const generatedText = resp.content?.trim() || "";
        if (!generatedText) throw new Error("The model returned an empty response.");
        const updatedVars = setVariablePath(config.output_variable, generatedText, variables);

        return {
          status: "succeeded",
          chosenBranchPort: "success",
          outputVariables: updatedVars,
        };
      } catch (err: unknown) {
        return {
          status: "failed",
          chosenBranchPort: "failure",
          error: err instanceof Error ? err.message : "Model generation failed",
        };
      }
    }

    return {
      status: "failed",
      chosenBranchPort: "failure",
      error: "Model gateway is not configured.",
    };
  }
}
