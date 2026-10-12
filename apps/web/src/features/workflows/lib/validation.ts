import type { ConditionGroup,ConditionRule } from "./types";

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, error: "Webhook URL is required." };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { valid: false, error: "URL protocol must be HTTP or HTTPS." };
    }
    if (parsed.username || parsed.password) {
      return { valid: false, error: "URL cannot contain embedded credentials." };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Please enter a valid absolute URL." };
  }
}

export function validateJsonBodyTemplate(bodyStr: string): { valid: boolean; error?: string } {
  const trimmed = bodyStr.trim();
  if (!trimmed) return { valid: true };

  // Temporarily replace template interpolations like {{event.text}} with valid string placeholders to test JSON structure
  const sanitized = trimmed.replace(/\{\{[^}]+\}\}/g, '"__TEMPLATE_VAR__"');

  try {
    JSON.parse(sanitized);
    return { valid: true };
  } catch {
    return { valid: false, error: "Request body must be valid JSON syntax." };
  }
}

export function validateConditionRule(rule: ConditionRule): { valid: boolean; error?: string } {
  if (!rule.field.trim()) {
    return { valid: false, error: "Field is required." };
  }
  if (!rule.operator) {
    return { valid: false, error: "Operator is required." };
  }

  const needsValue = rule.operator !== "exists" && rule.operator !== "not_exists";
  if (needsValue && !rule.value.trim()) {
    return { valid: false, error: "Value is required for this operator." };
  }

  return { valid: true };
}

export function validateConditionGroup(group: ConditionGroup | null | undefined): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!group || group.rules.length === 0) return issues;

  group.rules.forEach((rule, idx) => {
    const res = validateConditionRule(rule);
    if (!res.valid) {
      issues.push({ field: `rule-${idx}`, message: res.error || "Invalid condition rule" });
    }
  });

  return issues;
}
