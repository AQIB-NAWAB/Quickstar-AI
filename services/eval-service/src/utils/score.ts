import { createHash } from "node:crypto";
import type { ExpectedToolCall, ScoringMethod } from "../domain/types.js";

export type ScoreResult = {
  passed: boolean;
  score: number; // 0 to 1
  failureReason: string | null;
  method: ScoringMethod;
};

/** Trimmed case-sensitive equality. Empty actual response is never a pass unless expected is empty. */
export function scoreExactMatch(expected: string, actual: string | null | undefined): ScoreResult {
  if (actual === null || actual === undefined) {
    return {
      passed: false,
      score: 0,
      failureReason: "Actual output was empty or null",
      method: "exact_match",
    };
  }
  const expTrim = expected.trim();
  const actTrim = actual.trim();
  if (!actTrim && expTrim) {
    return {
      passed: false,
      score: 0,
      failureReason: "Actual output was empty",
      method: "exact_match",
    };
  }
  const passed = expTrim === actTrim;
  return {
    passed,
    score: passed ? 1 : 0,
    failureReason: passed ? null : "Exact match mismatch",
    method: "exact_match",
  };
}

/** Cosine similarity for vectors */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA <= 0 || normB <= 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(-1, Math.min(1, Number.isFinite(similarity) ? similarity : 0));
}

/** Deterministic normalized vector generator for test/offline environments */
export function deterministicVector(text: string, dimensions = 1536): number[] {
  const hash = createHash("sha256").update(text.trim()).digest();
  const vector = new Array<number>(dimensions);
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) {
    const byte = hash[i % hash.length];
    const val = (byte - 128) / 128;
    vector[i] = val;
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  return vector.map((v) => v / norm);
}

/** Score semantic similarity between expected and actual text using embeddings */
export function scoreSemanticSimilarity(
  expectedVec: number[],
  actualVec: number[],
  threshold = 0.85,
): ScoreResult {
  const similarity = cosineSimilarity(expectedVec, actualVec);
  const normalizedScore = Math.max(0, similarity);
  const passed = similarity >= threshold;
  return {
    passed,
    score: Math.round(normalizedScore * 1000) / 1000,
    failureReason: passed
      ? null
      : `Similarity ${similarity.toFixed(2)} was below threshold ${threshold.toFixed(2)}`,
    method: "semantic_similarity",
  };
}

/** Deterministically canonicalize JSON: sorts object keys recursively, preserves array order */
export function canonicalizeJson(val: unknown): unknown {
  if (val === null || typeof val !== "object") {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(canonicalizeJson);
  }
  const record = val as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const result: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    result[k] = canonicalizeJson(record[k]);
  }
  return result;
}

/** Check deep equality of canonicalized objects */
export function deepEqualsCanonical(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonicalizeJson(a)) === JSON.stringify(canonicalizeJson(b));
}

/** Score tool trace accuracy */
export function scoreToolTrace(
  expected: ExpectedToolCall[],
  actual: Array<{ name: string; arguments?: Record<string, unknown> }>,
  options: { requireOrder?: boolean; allowUnexpectedTools?: boolean } = {},
): ScoreResult {
  const requireOrder = options.requireOrder ?? true;
  const allowUnexpected = options.allowUnexpectedTools ?? false;

  if (expected.length === 0) {
    if (!allowUnexpected && actual.length > 0) {
      return {
        passed: false,
        score: 0,
        failureReason: `Unexpected tool call: ${actual[0].name}`,
        method: "tool_trace",
      };
    }
    return {
      passed: true,
      score: 1,
      failureReason: null,
      method: "tool_trace",
    };
  }

  if (actual.length === 0) {
    return {
      passed: false,
      score: 0,
      failureReason: `Missing expected tool call: ${expected[0].name}`,
      method: "tool_trace",
    };
  }

  if (!allowUnexpected && actual.length > expected.length) {
    const extra = actual[expected.length];
    return {
      passed: false,
      score: 0,
      failureReason: `Unexpected tool call: ${extra.name}`,
      method: "tool_trace",
    };
  }

  if (requireOrder) {
    for (let i = 0; i < expected.length; i++) {
      const exp = expected[i];
      const act = actual[i];
      if (!act) {
        return {
          passed: false,
          score: Math.round((i / expected.length) * 100) / 100,
          failureReason: `Missing expected tool call: ${exp.name}`,
          method: "tool_trace",
        };
      }
      if (exp.name !== act.name) {
        return {
          passed: false,
          score: Math.round((i / expected.length) * 100) / 100,
          failureReason: `Expected tool ${exp.name} at position ${i + 1}, received ${act.name}`,
          method: "tool_trace",
        };
      }
      if (exp.arguments && Object.keys(exp.arguments).length > 0) {
        const matches = deepEqualsCanonical(exp.arguments, act.arguments ?? {});
        if (!matches) {
          return {
            passed: false,
            score: Math.round((i / expected.length) * 100) / 100,
            failureReason: `Tool ${exp.name} arguments did not match expected`,
            method: "tool_trace",
          };
        }
      }
    }
    return {
      passed: true,
      score: 1,
      failureReason: null,
      method: "tool_trace",
    };
  }

  // Unordered matching
  let matchedCount = 0;
  const remainingActual = [...actual];

  for (const exp of expected) {
    const idx = remainingActual.findIndex((act) => {
      if (act.name !== exp.name) return false;
      if (exp.arguments && Object.keys(exp.arguments).length > 0) {
        return deepEqualsCanonical(exp.arguments, act.arguments ?? {});
      }
      return true;
    });

    if (idx === -1) {
      return {
        passed: false,
        score: Math.round((matchedCount / expected.length) * 100) / 100,
        failureReason: `Missing expected tool call: ${exp.name}`,
        method: "tool_trace",
      };
    }
    matchedCount++;
    remainingActual.splice(idx, 1);
  }

  if (!allowUnexpected && remainingActual.length > 0) {
    return {
      passed: false,
      score: Math.round((matchedCount / expected.length) * 100) / 100,
      failureReason: `Unexpected tool call: ${remainingActual[0].name}`,
      method: "tool_trace",
    };
  }

  return {
    passed: true,
    score: 1,
    failureReason: null,
    method: "tool_trace",
  };
}

export function meanScorePercent(passedCount: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((passedCount / total) * 10000) / 100;
}
