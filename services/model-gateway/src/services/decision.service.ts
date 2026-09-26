import { AppError, ErrorCode } from "@quickstart/errors";
import type { DecideRequestBody, DecideResponseBody } from "@quickstart/contracts";
import type { JevOpenRouterClient } from "../decisions/jev-openrouter.client.js";
import { ProviderError } from "../domain/types.js";

export class DecisionService {
  constructor(private readonly jev: JevOpenRouterClient | null) {}

  async decide(body: DecideRequestBody): Promise<DecideResponseBody> {
    if (!this.jev) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Jev decisions require OPENROUTER_API_KEY",
      });
    }

    try {
      return await this.jev.decide(body);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof ProviderError) {
        throw new AppError({
          code: error.retryable ? ErrorCode.UPSTREAM_UNAVAILABLE : ErrorCode.UPSTREAM_UNAVAILABLE,
          message: error.message,
        });
      }
      throw error;
    }
  }
}
