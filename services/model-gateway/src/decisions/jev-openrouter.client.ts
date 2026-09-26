import { AppError, ErrorCode } from "@quickstart/errors";
import type { DecideRequestBody, DecideResponseBody, JevQuestion } from "@quickstart/contracts";
import { ProviderError } from "../domain/types.js";

export type JevClientConfig = {
  apiKey: string;
  decisionsUrl: string;
  defaultModel: string;
  timeoutMs: number;
};

function toOpenRouterQuestions(questions: JevQuestion[]): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const q of questions) {
    const instructions = q.instructions ?? q.text;
    if (!instructions) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Question ${q.id} requires instructions or text`,
      });
    }
    const entry: Record<string, unknown> = {
      type: q.type,
      instructions,
    };
    if (q.criteria !== undefined) {
      entry.criteria = q.criteria;
    } else if (q.type === "choice" && q.options?.length) {
      entry.criteria = Object.fromEntries(q.options.map((option) => [option, option]));
    }
    out[q.id] = entry;
  }
  return out;
}

export class JevOpenRouterClient {
  constructor(private readonly config: JevClientConfig) {}

  async decide(body: DecideRequestBody): Promise<DecideResponseBody> {
    const started = Date.now();
    const model = body.jev_model ?? this.config.defaultModel;
    const payload = {
      model,
      state: body.state,
      questions: toOpenRouterQuestions(body.questions),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    let response: Response;
    try {
      response = await fetch(this.config.decisionsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "https://quickstart.local",
          "X-Title": process.env.OPENROUTER_TITLE ?? "QuickStart",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError({
          code: ErrorCode.UPSTREAM_TIMEOUT,
          message: "Jev decision request timed out",
        });
      }
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Jev decision request failed",
        cause: error,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      let detail = "";
      try {
        const errBody = (await response.json()) as { error?: { message?: string } };
        detail = errBody.error?.message ?? JSON.stringify(errBody).slice(0, 200);
      } catch {
        detail = await response.text().catch(() => "");
      }
      const retryable = response.status === 429 || response.status >= 500;
      throw new ProviderError(
        detail ? `jev upstream ${response.status}: ${detail}` : `jev upstream ${response.status}`,
        {
          retryable,
          httpStatus: response.status,
        },
      );
    }

    const json = (await response.json()) as {
      answers?: Record<string, unknown>;
      usage?: Record<string, unknown>;
    };

    return {
      answers: json.answers ?? {},
      usage: json.usage,
      model,
      latency_ms: Date.now() - started,
    };
  }
}
