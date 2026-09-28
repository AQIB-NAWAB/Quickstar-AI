import { createHash } from "node:crypto";

export type EmbeddingProvider = {
  embed(text: string): Promise<number[]>;
  dimensions: number;
};

export function createFakeEmbeddingProvider(dimensions = 1536): EmbeddingProvider {
  return {
    dimensions,
    async embed(text: string) {
      const hash = createHash("sha256").update(text).digest();
      const vector: number[] = new Array(dimensions);
      let norm = 0;
      for (let i = 0; i < dimensions; i++) {
        const val = (hash[i % hash.length] - 128) / 128;
        vector[i] = val;
        norm += val * val;
      }
      const mag = Math.sqrt(norm) || 1;
      return vector.map((v) => v / mag);
    },
  };
}

export function createEmbeddingProvider(config: {
  provider: "fake" | "openai";
  openaiApiKey?: string;
}): EmbeddingProvider {
  if (config.provider === "openai" && config.openaiApiKey) {
    const dimensions = 1536;
    return {
      dimensions,
      async embed(text: string) {
        const res = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            authorization: `Bearer ${config.openaiApiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: text,
          }),
        });
        if (!res.ok) {
          throw new Error(`OpenAI embeddings failed: ${res.status}`);
        }
        const body = (await res.json()) as { data: Array<{ embedding: number[] }> };
        return body.data[0]?.embedding ?? [];
      },
    };
  }
  return createFakeEmbeddingProvider();
}
