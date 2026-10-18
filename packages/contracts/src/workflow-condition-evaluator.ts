type ConditionOperator = string;
type ConditionRule = {
  id: string;
  field: string;
  operator: string;
  value: string;
  case_sensitive?: boolean;
};
type ConditionGroup = {
  id: string;
  logic: "and" | "or";
  rules?: ConditionRule[];
  groups?: ConditionGroup[];
  children?: Array<ConditionGroup | ConditionRule>;
};

export type EvaluationOptions = {
  caseSensitive?: boolean;
  missingValueBehavior?: "treat_as_false" | "treat_as_null" | "error";
};

export type RuleEvaluationResult = {
  ruleId: string;
  field: string;
  operator: ConditionOperator;
  expected: string;
  actual: unknown;
  matched: boolean;
  detail: string;
};

export type ConditionEvaluationResult = {
  matched: boolean;
  detail: string;
  rules: RuleEvaluationResult[];
  subGroups?: ConditionEvaluationResult[];
};

export function getByPath(root: Record<string, unknown>, path: string): unknown {
  const normalized = path.startsWith("event.") ? path.slice("event.".length) : path;
  const parts = normalized.split(".").filter(Boolean);
  let current: unknown = root;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    if (["__proto__", "constructor", "prototype"].includes(part) || !Object.hasOwn(current, part))
      return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function compare(
  operator: ConditionOperator,
  actual: unknown,
  expected: string,
  options: EvaluationOptions = {},
): { matched: boolean; detail: string } {
  const isMissing = actual === undefined || actual === null;

  if (isMissing) {
    if (operator === "not_exists") {
      return { matched: true, detail: "Value does not exist" };
    }
    if (operator === "exists") {
      return { matched: false, detail: "Value does not exist" };
    }
    if (operator === "is_empty") {
      return { matched: true, detail: "Value is empty" };
    }
    if (operator === "is_not_empty") {
      return { matched: false, detail: "Value is empty" };
    }
    if (options.missingValueBehavior === "error") {
      return { matched: false, detail: "Missing value treated as error" };
    }
    if (options.missingValueBehavior !== "treat_as_null") {
      return { matched: false, detail: "Missing value treated as false" };
    }
  }

  const caseSensitive = options.caseSensitive ?? false;
  const actualStr = String(actual ?? "");
  const expectedStr = expected ?? "";

  const aCompare = caseSensitive ? actualStr : actualStr.toLowerCase();
  const eCompare = caseSensitive ? expectedStr : expectedStr.toLowerCase();

  switch (operator) {
    case "exists":
      return {
        matched: actual !== undefined && actual !== null && actual !== "",
        detail: `Exists check (${actualStr ? "present" : "empty"})`,
      };
    case "not_exists":
      return {
        matched: actual === undefined || actual === null || actual === "",
        detail: `Not exists check (${actual === undefined || actual === null ? "absent" : "present"})`,
      };
    case "is_empty": {
      const empty =
        actual === undefined ||
        actual === null ||
        actual === "" ||
        (Array.isArray(actual) && actual.length === 0) ||
        (typeof actual === "object" && Object.keys(actual as object).length === 0);
      return { matched: empty, detail: empty ? "Value is empty" : "Value is not empty" };
    }
    case "is_not_empty": {
      const notEmpty =
        actual !== undefined &&
        actual !== null &&
        actual !== "" &&
        (!Array.isArray(actual) || actual.length > 0) &&
        (typeof actual !== "object" || Object.keys(actual as object).length > 0);
      return { matched: notEmpty, detail: notEmpty ? "Value is not empty" : "Value is empty" };
    }
    case "equals":
      return {
        matched: aCompare === eCompare,
        detail: `"${actualStr}" ${aCompare === eCompare ? "==" : "!="} "${expectedStr}"`,
      };
    case "not_equals":
      return {
        matched: aCompare !== eCompare,
        detail: `"${actualStr}" ${aCompare !== eCompare ? "!=" : "=="} "${expectedStr}"`,
      };
    case "contains":
      return {
        matched: aCompare.includes(eCompare),
        detail: `"${actualStr}" ${aCompare.includes(eCompare) ? "contains" : "does not contain"} "${expectedStr}"`,
      };
    case "not_contains":
      return {
        matched: !aCompare.includes(eCompare),
        detail: `"${actualStr}" ${!aCompare.includes(eCompare) ? "does not contain" : "contains"} "${expectedStr}"`,
      };
    case "starts_with":
      return {
        matched: aCompare.startsWith(eCompare),
        detail: `"${actualStr}" ${aCompare.startsWith(eCompare) ? "starts with" : "does not start with"} "${expectedStr}"`,
      };
    case "ends_with":
      return {
        matched: aCompare.endsWith(eCompare),
        detail: `"${actualStr}" ${aCompare.endsWith(eCompare) ? "ends with" : "does not end with"} "${expectedStr}"`,
      };
    case "greater_than": {
      const left =
        typeof actual === "number" || (typeof actual === "string" && actual.trim())
          ? Number(actual)
          : NaN;
      const right = typeof expected === "string" && expected.trim() ? Number(expected) : NaN;
      const ok = Number.isFinite(left) && Number.isFinite(right) && left > right;
      return { matched: ok, detail: `${left} > ${right} (${ok})` };
    }
    case "greater_than_or_equal": {
      const left =
        typeof actual === "number" || (typeof actual === "string" && actual.trim())
          ? Number(actual)
          : NaN;
      const right = typeof expected === "string" && expected.trim() ? Number(expected) : NaN;
      const ok = Number.isFinite(left) && Number.isFinite(right) && left >= right;
      return { matched: ok, detail: `${left} >= ${right} (${ok})` };
    }
    case "less_than": {
      const left =
        typeof actual === "number" || (typeof actual === "string" && actual.trim())
          ? Number(actual)
          : NaN;
      const right = typeof expected === "string" && expected.trim() ? Number(expected) : NaN;
      const ok = Number.isFinite(left) && Number.isFinite(right) && left < right;
      return { matched: ok, detail: `${left} < ${right} (${ok})` };
    }
    case "less_than_or_equal": {
      const left =
        typeof actual === "number" || (typeof actual === "string" && actual.trim())
          ? Number(actual)
          : NaN;
      const right = typeof expected === "string" && expected.trim() ? Number(expected) : NaN;
      const ok = Number.isFinite(left) && Number.isFinite(right) && left <= right;
      return { matched: ok, detail: `${left} <= ${right} (${ok})` };
    }
    default:
      return { matched: false, detail: `Unknown operator: ${String(operator)}` };
  }
}

export function evaluateRule(
  rule: ConditionRule,
  eventData: Record<string, unknown>,
  options: EvaluationOptions = {},
): boolean {
  const actual = getByPath(eventData, rule.field);
  return compare(rule.operator, actual, rule.value, options).matched;
}

export function evaluateRuleDetailed(
  rule: ConditionRule,
  eventData: Record<string, unknown>,
  options: EvaluationOptions = {},
): RuleEvaluationResult {
  const actual = getByPath(eventData, rule.field);
  const res = compare(rule.operator, actual, rule.value, {
    ...options,
    caseSensitive:
      (rule as ConditionRule & { case_sensitive?: boolean }).case_sensitive ??
      options.caseSensitive,
  });
  return {
    ruleId: rule.id || rule.field,
    field: rule.field,
    operator: rule.operator,
    expected: rule.value,
    actual,
    matched: res.matched,
    detail: res.detail,
  };
}

/**
 * Evaluates recursive ConditionGroup (supports nested AND/OR groups and typed operators)
 */
export function evaluateConditionGroup(
  group: ConditionGroup | null | undefined,
  eventData: Record<string, unknown>,
  options: EvaluationOptions = {},
): ConditionEvaluationResult {
  if (!group) {
    return { matched: true, detail: "No conditions configured (passes)", rules: [] };
  }

  const children = (group as unknown as { children?: Array<ConditionGroup | ConditionRule> })
    .children;
  const rules = children
    ? children.filter((c): c is ConditionRule => !("logic" in c))
    : (group.rules ?? []);
  const groups = children
    ? children.filter((c): c is ConditionGroup => "logic" in c)
    : (group.groups ?? []);
  if (!rules.length && !groups.length)
    return { matched: false, detail: "Empty condition group", rules: [] };
  const ruleResults = rules.map((rule) => evaluateRuleDetailed(rule, eventData, options));

  const subGroupResults = groups.map((subGroup) =>
    evaluateConditionGroup(subGroup, eventData, options),
  );

  const allChecks = [
    ...ruleResults.map((r) => r.matched),
    ...subGroupResults.map((g) => g.matched),
  ];

  const matched = group.logic === "or" ? allChecks.some(Boolean) : allChecks.every(Boolean);

  const failedCount = allChecks.filter((m) => !m).length;
  const detail = matched
    ? `Conditions matched (${group.logic.toUpperCase()})`
    : `Conditions not satisfied: ${failedCount} item(s) failed in ${group.logic.toUpperCase()} group`;

  return {
    matched,
    detail,
    rules: ruleResults,
    subGroups: subGroupResults.length > 0 ? subGroupResults : undefined,
  };
}
