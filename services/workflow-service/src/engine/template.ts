import { getWorkflowValue } from "@quickstart/contracts";
/** String interpolation; JSON mode escapes substitutions within JSON strings before parsing. */
export function renderTemplate(
  template: string,
  data: Record<string, unknown>,
  jsonMode = false,
): string {
  if (typeof template !== "string" || template.length > 262144)
    throw new Error("Invalid or oversized template");
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawPath: string, offset: number) => {
    const value = getWorkflowValue(data, rawPath.trim());
    const text =
      value === undefined || value === null
        ? ""
        : typeof value === "string"
          ? value
          : JSON.stringify(value);
    if (!jsonMode) return text;
    // Count unescaped quotes to detect an embedded JSON string value.
    let inString = false;
    let escaped = false;
    for (const char of template.slice(0, offset)) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') inString = !inString;
    }
    return inString ? JSON.stringify(text).slice(1, -1) : JSON.stringify(value ?? null);
  });
}
