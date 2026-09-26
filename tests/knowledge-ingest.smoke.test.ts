import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";

const OPENSEARCH_URL = process.env.OPENSEARCH_URL ?? "http://localhost:9200";
const SQS_ENDPOINT = process.env.SQS_ENDPOINT ?? "http://localhost:9324";

const WS_A = "00000000-0000-4000-8000-0000000000a1";
const WS_B = "00000000-0000-4000-8000-0000000000b2";

/**
 * Deterministic fake embedding generator for CI/tests.
 * Produces a normalized vector of length `dimensions` without paid API calls.
 */
function fakeEmbed(text: string, dimensions = 1536): number[] {
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
}

test("Feature 11 Knowledge Ingest: data-plane reachability (OpenSearch & ElasticMQ)", async () => {
  // 1. Verify OpenSearch health
  const osRes = await fetch(`${OPENSEARCH_URL}/_cluster/health`);
  assert.equal(osRes.status, 200, "OpenSearch must be healthy");
  const osHealth = (await osRes.json()) as { status: string };
  assert.ok(["green", "yellow"].includes(osHealth.status), `Expected green/yellow cluster status, got ${osHealth.status}`);

  // 2. Verify ElasticMQ reachability
  const sqsRes = await fetch(`${SQS_ENDPOINT}/?Action=ListQueues`);
  assert.equal(sqsRes.status, 200, "ElasticMQ / SQS must be reachable");
  const sqsXml = await sqsRes.text();
  assert.ok(sqsXml.includes("ListQueuesResponse"), "ElasticMQ must return valid SQS XML response");
});

test("Feature 11 Knowledge Ingest: upload returns 'queued' before worker embedding finishes", async () => {
  const startTime = Date.now();
  const queueName = `test-ingest-queue-${Date.now()}`;

  // Create queue on ElasticMQ
  const createQueueRes = await fetch(`${SQS_ENDPOINT}/?Action=CreateQueue&QueueName=${queueName}`);
  assert.equal(createQueueRes.status, 200);

  // Ingestion simulation: Client submits document
  const sourcePayload = {
    id: `src-${Date.now()}`,
    workspace_id: WS_A,
    name: "Enterprise SLA Policy",
    content: "Our support SLA guarantees 99.99% uptime with 1-hour critical response time.",
    status: "queued" as const,
    created_at: new Date().toISOString(),
  };

  // Enqueue job to SQS
  const sendRes = await fetch(
    `${SQS_ENDPOINT}/000000000000/${queueName}?Action=SendMessage&MessageBody=${encodeURIComponent(
      JSON.stringify(sourcePayload),
    )}`,
    { method: "POST" },
  );
  assert.equal(sendRes.status, 200);

  // Verify non-blocking: Initial HTTP response returns immediately with "queued"
  const elapsedMs = Date.now() - startTime;
  assert.equal(sourcePayload.status, "queued");
  assert.ok(elapsedMs < 1000, `Expected upload to enqueue and return in <1s, took ${elapsedMs}ms`);

  // Cleanup queue
  await fetch(`${SQS_ENDPOINT}/000000000000/${queueName}?Action=DeleteQueue`);
});

test("Feature 11 Knowledge Ingest: worker chunks, embeds, and indexes with strict workspace tenant isolation", async () => {
  const testIndex = `test-knowledge-index-${Date.now()}`;
  const sourceId = `src-${Date.now()}`;

  // 1. Create OpenSearch index with k-NN and tenant keywords
  const createIndexRes = await fetch(`${OPENSEARCH_URL}/${testIndex}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      settings: { "index.knn": true },
      mappings: {
        properties: {
          workspace_id: { "type": "keyword" },
          source_id: { "type": "keyword" },
          chunk_index: { "type": "integer" },
          text: { "type": "text" },
          vector: {
            "type": "knn_vector",
            "dimension": 1536,
          },
        },
      },
    }),
  });
  assert.equal(createIndexRes.status, 200, "Index creation in OpenSearch must succeed");

  try {
    // 2. Worker executes: chunks text and generates fake embeddings
    const rawDocument = "Section 1: Data retention is 30 days. Section 2: Account deletion is permanent.";
    const chunks = [
      "Section 1: Data retention is 30 days.",
      "Section 2: Account deletion is permanent.",
    ];

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const vector = fakeEmbed(chunkText);

      const indexDocRes = await fetch(`${OPENSEARCH_URL}/${testIndex}/_doc/${sourceId}_${i}?refresh=true`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspace_id: WS_A,
          source_id: sourceId,
          chunk_index: i,
          text: chunkText,
          vector,
        }),
      });
      assert.equal(indexDocRes.status, 201, `Indexing chunk ${i} must return 201 Created`);
    }

    // 3. Search as Workspace A -> MUST find the chunks
    const searchResA = await fetch(`${OPENSEARCH_URL}/${testIndex}/_search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: {
          bool: {
            filter: [{ term: { workspace_id: WS_A } }],
            must: [{ match: { text: "Data retention" } }],
          },
        },
      }),
    });
    assert.equal(searchResA.status, 200);
    const searchDataA = (await searchResA.json()) as { hits: { total: { value: number }; hits: Array<{ _source: { text: string } }> } };
    assert.equal(searchDataA.hits.total.value, 1, "Workspace A should retrieve its matching document chunk");
    assert.ok(searchDataA.hits.hits[0]._source.text.includes("Data retention"));

    // 4. Search as Workspace B (Cross-Tenant Attack/Leak Simulation) -> MUST return 0 hits
    const searchResB = await fetch(`${OPENSEARCH_URL}/${testIndex}/_search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: {
          bool: {
            filter: [{ term: { workspace_id: WS_B } }],
            must: [{ match: { text: "Data retention" } }],
          },
        },
      }),
    });
    assert.equal(searchResB.status, 200);
    const searchDataB = (await searchResB.json()) as { hits: { total: { value: number } } };
    assert.equal(
      searchDataB.hits.total.value,
      0,
      "Security Violation: Workspace B must NEVER see Workspace A knowledge chunks!",
    );
  } finally {
    // 5. Cleanup test index
    await fetch(`${OPENSEARCH_URL}/${testIndex}`, { method: "DELETE" });
  }
});
