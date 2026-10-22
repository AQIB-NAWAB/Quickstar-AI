import type { AgentGraphNode, KnowledgeSearchNodeConfig } from "@quickstart/contracts";
import type { ExecutionContext, GraphNodeHandler, NodeExecutionResult } from "../types.js";
import { resolveVariablePath, setVariablePath } from "../eval-utils.js";
import type { KnowledgeClient } from "../../clients/knowledge.client.js";

export class KnowledgeSearchHandler implements GraphNodeHandler<"knowledge_search"> {
  type = "knowledge_search" as const;

  constructor(private readonly knowledgeClient?: KnowledgeClient) {}

  async execute(
    node: AgentGraphNode<"knowledge_search">,
    ctx: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.config as KnowledgeSearchNodeConfig;
    const variables = ctx.sessionState.variables || {};

    const query =
      (resolveVariablePath(config.query_variable || "visitor.message", variables) as string) ||
      ctx.visitorMessage ||
      "";

    if (!query.trim()) {
      return {
        status: "succeeded",
        chosenBranchPort: "no_matches",
      };
    }

    if (this.knowledgeClient) {
      try {
        let results = await this.knowledgeClient.retrieve(
          ctx.workspaceId,
          query,
          ctx.requestId,
          config.max_results || 5,
          ctx.abortSignal,
        );

        if (config.source_ids?.length)
          results = results.filter((r) => config.source_ids!.includes(r.source_id));
        if (!results || results.length === 0) {
          return {
            status: "succeeded",
            chosenBranchPort: "no_matches",
          };
        }

        const outputKey = config.output_variable || "knowledge.results";
        const updatedVars = setVariablePath(outputKey, results, variables);

        return {
          status: "succeeded",
          chosenBranchPort: "results_found",
          outputVariables: updatedVars,
        };
      } catch (err: unknown) {
        return {
          status: "failed",
          chosenBranchPort: "failure",
          error: err instanceof Error ? err.message : "Knowledge retrieval failed",
        };
      }
    }

    return {
      status: "failed",
      chosenBranchPort: "failure",
      error: "Knowledge retrieval is not configured.",
    };
  }
}
