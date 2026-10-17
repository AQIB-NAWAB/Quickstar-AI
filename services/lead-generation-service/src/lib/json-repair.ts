/**
 * Resilient JSON parsing utility for LLM research responses in the lead-generation service.
 * Handles markdown code block wrapping, single quotes, trailing commas,
 * unquoted keys, and surrounding explanatory prose.
 */
export function repairAndParseJson(raw: string | undefined): unknown {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Direct parse attempt
  try {
    const direct = JSON.parse(trimmed) as unknown;
    if (typeof direct === "string") {
      try {
        return JSON.parse(direct) as unknown;
      } catch {
        return direct;
      }
    }
    return direct;
  } catch {
    /* continue to repair */
  }

  // 2. Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  let cleaned = trimmed.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1").trim();

  // 3. Extract JSON object or array substring
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  let candidates: string[] = [];
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
  }
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    candidates.push(cleaned.slice(firstBracket, lastBracket + 1));
  }
  if (candidates.length === 0) candidates.push(cleaned);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* continue */
    }

    // 4. Sanitize trailing commas: ,} -> } and ,] -> ]
    let sanitized = candidate.replace(/,\s*([}\]])/g, "$1");

    // 5. Quote unquoted keys: { key: ... } or , key: ...
    sanitized = sanitized.replace(/([{,]\s*)([a-zA-Z0-9_$-]+)\s*:/g, '$1"$2":');

    // 6. Replace single quotes around keys or string values with double quotes
    sanitized = sanitized.replace(/(?<=^|[{[,:\s])'([^'\\]*(?:\\.[^'\\]*)*)'(?=[\s,}\]]|$)/g, '"$1"');

    try {
      return JSON.parse(sanitized);
    } catch {
      /* try next candidate */
    }
  }

  return null;
}
