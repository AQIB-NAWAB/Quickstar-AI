import { AppError, ErrorCode } from "@quickstart/errors";
import type { EmbeddingProvider } from "../lib/embed.js";
import type { OpenSearchClient } from "../lib/opensearch.js";

export class RetrieveService {
  constructor(
    private readonly opensearch: OpenSearchClient,
    private readonly embedder: EmbeddingProvider,
  ) {}

  async retrieve(input: { workspaceId: string; query: string; limit?: number }) {
    const query = input.query?.trim();
    if (!query) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Query text is required" });
    }
    const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);
    const vector = await this.embedder.embed(query);
    const chunks = await this.opensearch.search(input.workspaceId, query, vector, limit);
    return { chunks };
  }
}
