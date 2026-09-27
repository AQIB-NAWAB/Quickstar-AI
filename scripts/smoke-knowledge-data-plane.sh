#!/usr/bin/env bash
# Feature 11: Knowledge Ingest — Data Plane Smoke Test
# Verifies OpenSearch (:9200) cluster health, ElasticMQ/SQS (:9324) queue reachability,
# and proves multi-tenant document indexing and querying with workspace_id isolation.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OPENSEARCH_URL="${OPENSEARCH_URL:-http://localhost:9200}"
SQS_ENDPOINT="${SQS_ENDPOINT:-http://localhost:9324}"

echo "=========================================================="
echo "Feature 11: Knowledge Ingest — Data Plane Verification"
echo "=========================================================="

# 1. Verify container runtime
echo "==> 1. Checking running containers..."
if ! docker compose ps --status running --quiet 2>/dev/null | grep -q .; then
  echo "Error: Local data plane is not running. Run 'make up' first." >&2
  exit 1
fi

# 2. Check OpenSearch Cluster Health
echo "==> 2. Verifying OpenSearch (:9200) cluster health..."
OS_HEALTH=$(curl -sf "${OPENSEARCH_URL}/_cluster/health" || true)
if [ -z "$OS_HEALTH" ]; then
  echo "Error: OpenSearch is not responding at ${OPENSEARCH_URL}" >&2
  exit 1
fi
OS_STATUS=$(echo "$OS_HEALTH" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
echo "OpenSearch cluster status: ${OS_STATUS} (reachable)"

# 3. Check ElasticMQ / SQS reachability (HTTP SQS protocol)
echo "==> 3. Verifying ElasticMQ / SQS (:9324) reachability..."
QUEUE_NAME="quickstart-knowledge-ingest-smoke-${RANDOM}"

# Create queue
CREATE_RESP=$(curl -s "${SQS_ENDPOINT}/?Action=CreateQueue&QueueName=${QUEUE_NAME}")
if [[ "$CREATE_RESP" != *"CreateQueueResponse"* ]]; then
  echo "Error: Failed to create SQS queue on ElasticMQ: ${CREATE_RESP}" >&2
  exit 1
fi
echo "Created test queue ${QUEUE_NAME} on ElasticMQ"

# Send message
SEND_RESP=$(curl -s -X POST "${SQS_ENDPOINT}/000000000000/${QUEUE_NAME}?Action=SendMessage&MessageBody=smoke-ingest-payload")
if [[ "$SEND_RESP" != *"SendMessageResponse"* ]]; then
  echo "Error: Failed to send message to ElasticMQ: ${SEND_RESP}" >&2
  exit 1
fi
echo "Enqueued test ingest job message"

# Receive message
RECV_RESP=$(curl -s "${SQS_ENDPOINT}/000000000000/${QUEUE_NAME}?Action=ReceiveMessage")
if [[ "$RECV_RESP" != *"smoke-ingest-payload"* ]]; then
  echo "Error: Failed to receive message from ElasticMQ: ${RECV_RESP}" >&2
  exit 1
fi
echo "Received ingest job message successfully from queue"

# Cleanup test queue
curl -s "${SQS_ENDPOINT}/000000000000/${QUEUE_NAME}?Action=DeleteQueue" >/dev/null 2>&1 || true
echo "ElasticMQ / SQS queue health and message flow verified ✓"

# 4. Multi-Tenant OpenSearch Document Indexing & Querying Smoke
echo "==> 4. Verifying multi-tenant OpenSearch indexing and isolation..."
TEST_INDEX="quickstart-knowledge-smoke-${RANDOM}"
WS_A="00000000-0000-4000-8000-0000000000a1"
WS_B="00000000-0000-4000-8000-0000000000b2"
SOURCE_ID="src-test-001"

# Create throwaway index with k-NN vector & tenant mapping
curl -sf -X PUT "${OPENSEARCH_URL}/${TEST_INDEX}" \
  -H 'content-type: application/json' \
  -d '{
    "settings": { "index.knn": true },
    "mappings": {
      "properties": {
        "workspace_id": { "type": "keyword" },
        "source_id": { "type": "keyword" },
        "chunk_index": { "type": "integer" },
        "text": { "type": "text" }
      }
    }
  }' >/dev/null

# Index document into Workspace A
curl -sf -X POST "${OPENSEARCH_URL}/${TEST_INDEX}/_doc/doc-1?refresh=true" \
  -H 'content-type: application/json' \
  -d "{
    \"workspace_id\": \"${WS_A}\",
    \"source_id\": \"${SOURCE_ID}\",
    \"chunk_index\": 0,
    \"text\": \"Confidential workspace knowledge content.\"
  }" >/dev/null

# Search with Workspace A filter -> expect 1 hit
HITS_A=$(curl -sf -X POST "${OPENSEARCH_URL}/${TEST_INDEX}/_search" \
  -H 'content-type: application/json' \
  -d "{
    \"query\": {
      \"bool\": {
        \"filter\": [
          { \"term\": { \"workspace_id\": \"${WS_A}\" } }
        ],
        \"must\": [
          { \"match\": { \"text\": \"Confidential\" } }
        ]
      }
    }
  }" | grep -o '"total":{"value":[0-9]*' | cut -d':' -f3)

if [ "$HITS_A" -ne 1 ]; then
  echo "Error: Expected 1 hit for Workspace A, got ${HITS_A}" >&2
  curl -sf -X DELETE "${OPENSEARCH_URL}/${TEST_INDEX}" >/dev/null || true
  exit 1
fi
echo "Workspace A query returned 1 hit as expected."

# Search with Workspace B filter -> MUST return 0 hits (tenant isolation)
HITS_B=$(curl -sf -X POST "${OPENSEARCH_URL}/${TEST_INDEX}/_search" \
  -H 'content-type: application/json' \
  -d "{
    \"query\": {
      \"bool\": {
        \"filter\": [
          { \"term\": { \"workspace_id\": \"${WS_B}\" } }
        ],
        \"must\": [
          { \"match\": { \"text\": \"Confidential\" } }
        ]
      }
    }
  }" | grep -o '"total":{"value":[0-9]*' | cut -d':' -f3)

if [ "$HITS_B" -ne 0 ]; then
  echo "Security Error: Cross-tenant data leak! Workspace B retrieved ${HITS_B} documents from Workspace A!" >&2
  curl -sf -X DELETE "${OPENSEARCH_URL}/${TEST_INDEX}" >/dev/null || true
  exit 1
fi
echo "Workspace B query returned 0 hits (Tenant isolation verified ✓)."

# Cleanup throwaway index
curl -sf -X DELETE "${OPENSEARCH_URL}/${TEST_INDEX}" >/dev/null 2>&1 || true

echo ""
echo "=========================================================="
echo "All Knowledge Ingest data-plane smoke checks PASSED."
echo "=========================================================="
