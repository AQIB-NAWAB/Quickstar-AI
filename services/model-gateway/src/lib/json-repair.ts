/**
 * Resilient JSON parsing utility for LLM tool call arguments.
 * Handles markdown wrappers, single-quotes, trailing commas, unquoted keys,
 * and outer prose text.
 */
export function repairAndParseJson(raw: string | undefined): Record<string, unknown> {
  if (!raw || typeof raw !== "string") return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};

  // 1. Direct parse attempt
  try {
    const direct = JSON.parse(trimmed) as unknown;
    if (direct && typeof direct === "object" && !Array.isArray(direct)) {
      return direct as Record<string, unknown>;
    }
    if (typeof direct === "string") {
      // Possible double-serialized JSON string
      try {
        const nested = JSON.parse(direct) as unknown;
        if (nested && typeof nested === "object" && !Array.isArray(nested)) {
          return nested as Record<string, unknown>;
        }
      } catch {
        /* continue to sanitized repair */
      }
    }
    return { value: direct };
  } catch {
    /* continue to repair */
  }

  // 2. Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  let cleaned = trimmed.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1").trim();

  // 3. Extract JSON object substring between first '{' and last '}'
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  } else {
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.slice(firstBracket, lastBracket + 1);
    }
  }

  // Try parsing after extraction
  try {
    const extracted = JSON.parse(cleaned) as unknown;
    if (extracted && typeof extracted === "object" && !Array.isArray(extracted)) {
      return extracted as Record<string, unknown>;
    }
    return { value: extracted };
  } catch {
    /* continue to regex repairs */
  }

  // 4. Sanitize trailing commas: ,} -> } and ,] -> ]
  let sanitized = cleaned.replace(/,\s*([}\]])/g, "$1");

  // 5. Quote unquoted keys: { key: ... } or , key: ...
  sanitized = sanitized.replace(/([{,]\s*)([a-zA-Z0-9_$-]+)\s*:/g, '$1"$2":');

  // 6. Replace single quotes around keys or string values with double quotes
  sanitized = sanitized.replace(/(?<=^|[{[,:\s])'([^'\\]*(?:\\.[^'\\]*)*)'(?=[\s,}\]]|$)/g, '"$1"');

  try {
    const repaired = JSON.parse(sanitized) as unknown;
    if (repaired && typeof repaired === "object" && !Array.isArray(repaired)) {
      return repaired as Record<string, unknown>;
    }
    return { value: repaired };
  } catch {
    // Preserve raw string if unrecoverable
    return { raw };
  }
}
