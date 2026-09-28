import type { KnowledgeConfig } from "../config/environment.js";

export type ChunkDocument = {
  workspace_id: string;
  source_id: string;
  chunk_id: string;
  chunk_index: number;
  text: string;
  vector: number[];
};

export class OpenSearchClient {
  constructor(
    private readonly config: KnowledgeConfig,
    private readonly dimensions: number,
  ) {}

  async ensureIndex(): Promise<void> {
    const index = this.config.opensearchIndex;
    const head = await fetch(`${this.config.opensearchUrl}/${index}`);
    if (head.status === 200) {
      return;
    }
    const res = await fetch(`${this.config.opensearchUrl}/${index}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        settings: { "index.knn": true },
        mappings: {
          properties: {
            workspace_id: { type: "keyword" },
            source_id: { type: "keyword" },
            chunk_id: { type: "keyword" },
            chunk_index: { type: "integer" },
            text: { type: "text" },
            vector: { type: "knn_vector", dimension: this.dimensions },
          },
        },
      }),
    });
    if (!res.ok && res.status !== 400) {
      throw new Error(`OpenSearch create index failed: ${res.status}`);
    }
  }

  async deleteBySource(workspaceId: string, sourceId: string): Promise<void> {
    const index = this.config.opensearchIndex;
    await fetch(`${this.config.opensearchUrl}/${index}/_delete_by_query?refresh=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: {
          bool: {
            filter: [
              { term: { workspace_id: workspaceId } },
              { term: { source_id: sourceId } },
            ],
          },
        },
      }),
    });
  }

  async indexChunks(docs: ChunkDocument[]): Promise<void> {
    if (docs.length === 0) {
      return;
    }
    const index = this.config.opensearchIndex;
    const body = docs.flatMap((doc) => [
      JSON.stringify({ index: { _index: index, _id: doc.chunk_id } }),
      JSON.stringify(doc),
    ]);
    const res = await fetch(`${this.config.opensearchUrl}/_bulk?refresh=true`, {
      method: "POST",
      headers: { "content-type": "application/x-ndjson" },
      body: `${body.join("\n")}\n`,
    });
    if (!res.ok) {
      throw new Error(`OpenSearch bulk index failed: ${res.status}`);
    }
  }

  async search(workspaceId: string, queryText: string, vector: number[], limit: number) {
    const index = this.config.opensearchIndex;
    const body = buildHybridSearchBody(workspaceId, queryText, vector, limit);
    const res = await fetch(`${this.config.opensearchUrl}/${index}/_search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const fallback = await fetch(`${this.config.opensearchUrl}/${index}/_search`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          size: limit,
          query: {
            bool: {
              filter: [{ term: { workspace_id: workspaceId } }],
              must: [{ match: { text: queryText } }],
            },
          },
        }),
      });
      if (!fallback.ok) {
        throw new Error(`OpenSearch search failed: ${res.status}`);
      }
      const data = (await fallback.json()) as {
        hits: { hits: Array<{ _score: number; _source: ChunkDocument }> };
      };
      return data.hits.hits.map((hit) => ({
        chunk_id: hit._source.chunk_id,
        source_id: hit._source.source_id,
        text: hit._source.text,
        score: hit._score,
      }));
    }
    const data = (await res.json()) as {
      hits: { hits: Array<{ _score: number; _source: ChunkDocument }> };
    };
    return data.hits.hits.map((hit) => ({
      chunk_id: hit._source.chunk_id,
      source_id: hit._source.source_id,
      text: hit._source.text,
      score: hit._score,
    }));
  }
}

export function buildHybridSearchBody(
  workspaceId: string,
  queryText: string,
  vector: number[],
  limit: number,
): Record<string, unknown> {
  const k = Math.min(Math.max(limit * 2, limit), 40);
  return {
    size: limit,
    query: {
      bool: {
        filter: [{ term: { workspace_id: workspaceId } }],
        must: [
          {
            knn: {
              vector: {
                vector,
                k,
              },
            },
          },
        ],
        should: [
          {
            match: {
              text: {
                query: queryText,
                boost: 0.25,
              },
            },
          },
        ],
      },
    },
  };
}
