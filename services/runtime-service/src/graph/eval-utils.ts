export function resolveVariablePath(
  path: string | undefined,
  variables: Record<string, unknown>,
): unknown {
  if (!path) return undefined;
  const clean = path.trim().replace(/^\{\{\s*|\s*\}\}$/g, "");
  const parts = clean.split(".");
  if (parts.some((p) => !p || ["__proto__", "constructor", "prototype"].includes(p)))
    return undefined;
  let curr: unknown = variables;
  for (const part of parts) {
    if (curr === null || curr === undefined || typeof curr !== "object") {
      return undefined;
    }
    curr = (curr as Record<string, unknown>)[part];
  }
  return curr;
}

export function interpolateTemplate(
  template: string | undefined,
  variables: Record<string, unknown>,
): string {
  if (!template) return "";
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, path) => {
    const val = resolveVariablePath(path, variables);
    if (val === undefined || val === null) {
      return "";
    }
    if (typeof val === "object") {
      return JSON.stringify(val);
    }
    return String(val);
  });
}

export function setVariablePath(
  path: string | undefined,
  value: unknown,
  variables: Record<string, unknown>,
): Record<string, unknown> {
  if (!path) return variables;
  const clean = path.trim().replace(/^\{\{\s*|\s*\}\}$/g, "");
  if (!clean) return variables;
  const parts = clean.split(".");
  if (parts.some((p) => !p || ["__proto__", "constructor", "prototype"].includes(p)))
    throw new Error("Invalid variable path");
  const updated = { ...variables };

  let curr: Record<string, unknown> = updated;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!curr[part] || typeof curr[part] !== "object") {
      curr[part] = {};
    } else {
      curr[part] = { ...(curr[part] as Record<string, unknown>) };
    }
    curr = curr[part] as Record<string, unknown>;
  }

  curr[parts[parts.length - 1]] = value;
  return updated;
}
