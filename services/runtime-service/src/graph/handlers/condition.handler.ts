import type { AgentGraphNode, ConditionNodeConfig, ConditionRule } from "@quickstart/contracts";
import type { ExecutionContext, GraphNodeHandler, NodeExecutionResult } from "../types.js";
import { resolveVariablePath } from "../eval-utils.js";

export class ConditionHandler implements GraphNodeHandler<"condition"> {
  type = "condition" as const;

  async execute(
    node: AgentGraphNode<"condition">,
    ctx: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.config as ConditionNodeConfig;
    const variables = ctx.sessionState.variables || {};

    if (!Array.isArray(config.rules) || config.rules.length === 0) {
      return {
        status: "succeeded",
        chosenBranchPort: "otherwise",
      };
    }

    if (
      config.missing_value_behavior === "fail" &&
      config.rules.some((r) => resolveVariablePath(r.variable, variables) == null)
    )
      return { status: "failed", error: "A condition variable is missing." };
    const results = config.rules.map((rule) => this.evaluateRule(rule, variables, config));

    let isMatch = false;
    if (config.match_mode === "any") {
      isMatch = results.some((r) => r === true);
    } else {
      isMatch = results.every((r) => r === true);
    }

    return {
      status: "succeeded",
      chosenBranchPort: isMatch ? "match" : "otherwise",
    };
  }

  private evaluateRule(
    rule: ConditionRule,
    variables: Record<string, unknown>,
    config: ConditionNodeConfig,
  ): boolean {
    const val = resolveVariablePath(rule.variable, variables);

    if (val === undefined || val === null) {
      if (rule.operator === "is_empty") return true;
      if (rule.operator === "is_not_empty") return false;
      return config.missing_value_behavior === "otherwise" ? false : false;
    }

    switch (rule.operator) {
      case "is_empty":
        if (Array.isArray(val)) return val.length === 0;
        return String(val).trim().length === 0;

      case "is_not_empty":
        if (Array.isArray(val)) return val.length > 0;
        return String(val).trim().length > 0;

      case "equals":
        return String(val).toLowerCase() === String(rule.value).toLowerCase();

      case "not_equals":
        return String(val).toLowerCase() !== String(rule.value).toLowerCase();

      case "greater_than": {
        const numVal = Number(val);
        const targetNum = Number(rule.value);
        if (Number.isNaN(numVal) || Number.isNaN(targetNum)) return false;
        return numVal > targetNum;
      }

      case "less_than": {
        const numVal = Number(val);
        const targetNum = Number(rule.value);
        if (Number.isNaN(numVal) || Number.isNaN(targetNum)) return false;
        return numVal < targetNum;
      }

      case "contains":
        return String(val).toLowerCase().includes(String(rule.value).toLowerCase());

      default:
        return false;
    }
  }
}
