function getPath(root: Record<string, unknown>, path: string): unknown {
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

/** Replace {{path}} tokens. Does not use eval. */
export function renderTemplate(template: string, eventData: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawPath: string) => {
    const value = getPath(eventData, rawPath.trim());
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  });
}
