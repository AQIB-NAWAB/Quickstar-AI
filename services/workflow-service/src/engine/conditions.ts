import type { ConditionGroup, ConditionOperator, ConditionRule } from "../domain/types.js";

function getByPath(root: Record<string, unknown>, path: string): unknown {
  const normalized = path.startsWith("event.") ? path.slice("event.".length) : path;
  const parts = normalized.split(".").filter(Boolean);
  let current: unknown = root;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function compare(operator: ConditionOperator, actual: unknown, expected: string): boolean {
  switch (operator) {
    case "exists":
      return actual !== undefined && actual !== null && actual !== "";
    case "not_exists":
      return actual === undefined || actual === null || actual === "";
    case "equals":
      return String(actual ?? "") === expected;
    case "not_equals":
      return String(actual ?? "") !== expected;
    case "contains":
      return String(actual ?? "").toLowerCase().includes(expected.toLowerCase());
    case "not_contains":
      return !String(actual ?? "").toLowerCase().includes(expected.toLowerCase());
    case "greater_than": {
      const left = Number(actual);
      const right = Number(expected);
      return Number.isFinite(left) && Number.isFinite(right) && left > right;
    }
    case "less_than": {
      const left = Number(actual);
      const right = Number(expected);
      return Number.isFinite(left) && Number.isFinite(right) && left < right;
    }
    default:
      return false;
  }
}

export function evaluateRule(
  rule: ConditionRule,
  eventData: Record<string, unknown>,
): boolean {
  const actual = getByPath(eventData, rule.field);
  return compare(rule.operator, actual, rule.value);
}

/**
 * Missing/empty condition group matches (always true).
 * Failed condition evaluation returns skipped (caller treats false as skip).
 */
export function evaluateConditionGroup(
  group: ConditionGroup | null | undefined,
  eventData: Record<string, unknown>,
): { matched: boolean; detail: string } {
  if (!group || group.rules.length === 0) {
    return { matched: true, detail: "No conditions" };
  }

  const results = group.rules.map((rule) => ({
    rule,
    ok: evaluateRule(rule, eventData),
  }));

  const matched =
    group.logic === "or"
      ? results.some((r) => r.ok)
      : results.every((r) => r.ok);

  const failed = results.filter((r) => !r.ok).map((r) => r.rule.field);
  return {
    matched,
    detail: matched
      ? `Conditions matched (${group.logic})`
      : `Conditions not matched: ${failed.join(", ") || "rules"}`,
  };
}
