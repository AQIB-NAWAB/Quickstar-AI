# QuickStart AI — Complete Project Wiki

> Yeh document project samajhne ke liye hai. Koi run karne ki zaroorat nahi.  
> **Padho → Samjho → Phir code dekho.**

---

## Table of Contents

1. [Project Kya Hai?](#1-project-kya-hai)
2. [Kyun Bana Rahe Hain?](#2-kyun-bana-rahe-hain)
3. [Big Picture Architecture](#3-big-picture-architecture)
4. [Monorepo Structure](#4-monorepo-structure)
5. [Shared Packages](#5-shared-packages-packages)
6. [All Services — Port Map](#6-all-services--port-map)
7. [Service-by-Service Guide](#7-service-by-service-guide)
8. [Data Layer](#8-data-layer-databases-cache-queues)
9. [Multi-Tenancy & RBAC](#9-multi-tenancy--rbac)
10. [Auth Flow](#10-auth-flow-login--jwt--request)
11. [Request Lifecycle](#11-request-lifecycle-ek-api-call-ka-safar)
12. [Agent Runtime — Conversation Turn](#12-agent-runtime--conversation-turn)
13. [Knowledge Ingest (RAG)](#13-knowledge-ingest-rag)
14. [Memory Service](#14-memory-service)
15. [Secrets Vault (Feature 16)](#15-secrets-vault-feature-16)
16. [ADR Index](#16-adr-index-architecture-decisions)
17. [Feature Roadmap Status](#17-feature-roadmap-status)
18. [Key Patterns](#18-key-patterns-to-know)
19. [Glossary](#19-glossary)

---

## 1. Project Kya Hai?

**QuickStart AI** ek **production-grade, multi-tenant AI Agent Platform** hai.

Iska matlab: koi bhi business apne liye AI agents bana sakta hai — jo unke apne knowledge, tools, aur APIs use kare — aur unhe deploy kare:

- Website chat widget
- Inbound/Outbound AI voice calls
- API / SDK ke through backend systems
- Automated workflows

**Target Scale:**
- **10,000 HTTP req/sec** sustained, 20,000 peak
- **10,000+ concurrent** open conversations
- **5,000 inbound + 5,000 outbound** concurrent voice calls

---

## 2. Kyun Bana Rahe Hain?

Sirf product banana goal nahi hai. Yeh ek **practical engineering exercise** hai jisme seekhna hai:

| Topic | Kahan Use Hoga |
|---|---|
| Microservices | Har service apna port, apna DB schema |
| Distributed Systems | Kafka events, idempotency, retry |
| Multi-tenancy | `workspace_id` har row mein |
| RBAC | Permission strings, roles |
| Event-driven arch | Kafka topics, consumer groups |
| Secrets management | AES-256-GCM encryption, vault |
| Observability | OTel tracing, structured logs |
| RAG / AI | Knowledge ingest, OpenSearch, runtime |

---

## 3. Big Picture Architecture

```
                         +----------------------------------+
  Client (Browser/SDK)   |   API Gateway  :3000             |
  ---------------------> |   (gateway-service)              |
                         |   JWT check -> proxy to service  |
                         +----------+------------------------+
                                    |
        +---------------------------+-------------------------------+
        |                           |                              |
   +----+-----+              +------+------+              +--------+--------+
   | identity |              |  workspace  |              |  agent-service  |
   |  :3001   |              |   :3002     |              |     :3003       |
   | users,   |              | workspaces, |              | agent drafts,   |
   | JWT, org |              | members,    |              | versions,       |
   | API keys |              | RBAC        |              | publish, diff   |
   +----------+              +-------------+              +-----------------+

   +----------+              +-------------+              +-----------------+
   |conversation|            |    runtime  |              |  model-gateway  |
   |   :3004   |<-----------+|    :3006    |+----------->|     :3005       |
   | messages, |             | agent loop, |              | OpenAI/Anthropic|
   | history   |             | tool calls  |              | /Claude/Gemini  |
   +----------+              +-------------+              +-----------------+
                                    |
        +---------------------------+---------------------------+
        |                           |                          |
   +----+-----------+      +--------+-----+          +--------+--------+
   |   knowledge   |      |    memory    |          | secrets-service |
   |    :3009      |      |    :3010     |          |     :3011       |
   | RAG ingest,   |      | user facts,  |          | AES-256-GCM     |
   | OpenSearch    |      | long-term    |          | encrypted vault |
   +---------------+      +--------------+          +-----------------+
        |
   +----+-----------+      +--------------+
   |  web-fetch    |      |   Kafka      |
   |    :3007      |      |  (events)    |
   | scrape/crawl  |      |              |
   | /search       |      +--------------+
   +---------------+

Data Stores:
  PostgreSQL :5433  -- primary source of truth (all services, shared schema)
  Valkey/Redis :6379 -- membership cache, rate limiting, sessions
  OpenSearch :9200  -- vector search for RAG (knowledge service)
  Kafka :9092       -- event streaming
  ElasticMQ :9324   -- SQS-compatible queue
```

**Golden rule:** Gateway `:3000` hi ek public door hai. Baki sab ports internal/development mein directly accessible hain but production mein nahi honge.

---

## 4. Monorepo Structure

```
quickstart-ai/
+-- packages/               <- Shared libraries (imported by all services)
|   +-- auth/               <- JWT verify, API key extraction
|   +-- contracts/          <- RBAC permissions, role types
|   +-- errors/             <- AppError class, ErrorCode enum
|   +-- http-server/        <- Express factory, middleware, createPlatformApp
|   +-- logging/            <- Pino structured logger
|   +-- tracing/            <- OpenTelemetry setup
|   +-- utilities/          <- UUID, date helpers
|   +-- workspace-access/   <- requirePermission(), tenant guard
|
+-- services/               <- Each is a standalone Node.js process
|   +-- gateway-service/    :3000 (public edge)
|   +-- identity-service/   :3001
|   +-- workspace-service/  :3002
|   +-- agent-service/      :3003
|   +-- conversation-service/ :3004
|   +-- model-gateway/      :3005
|   +-- runtime-service/    :3006
|   +-- web-fetch-service/  :3007
|   +-- knowledge-service/  :3009
|   +-- memory-service/     :3010
|   +-- secrets-service/    :3011
|
+-- docs/
|   +-- adr/                <- Architecture Decision Records (0001-0016)
|   +-- api/                <- API docs per service
|   +-- architecture/       <- High-level diagrams & explanations
|   +-- roadmap.md          <- Master feature plan
|   +-- ai-roadmap.md       <- Deep learning per feature
|
+-- memory-bank/            <- Agent session state
+-- Makefile                <- make up, make down, make *-migrate
+-- docker-compose.yml      <- Local data plane
```

---

## 5. Shared Packages (`packages/`)

### `@quickstart/errors`
```typescript
// Har service error handling same tarike se karti hai
throw new AppError(ErrorCode.NOT_FOUND, "agent not found");
throw new AppError(ErrorCode.FORBIDDEN, "insufficient permissions");
throw new AppError(ErrorCode.CONFLICT, "version mismatch");
```
`AppError` -> Express error handler -> proper HTTP status + JSON body.

---

### `@quickstart/http-server`
```typescript
// Har service ka entry point aisa hota hai:
const app = createPlatformApp(apiRouter);
app.listen(env.port);
```
`createPlatformApp` already add karta hai:
- Request ID header
- OTel tracing
- JSON body size limit
- Rate limiting (backup)
- Request timeout

Services ko manually middleware add nahi karni padti.

---

### `@quickstart/auth`
```typescript
// Gateway JWT verify karta hai aur yeh header downstream bhejta hai:
"x-quickstart-auth-context": base64(JSON.stringify({ userId, orgId, workspaceId }))

// Services is header ko padhte hain:
const ctx = extractAuthContext(req);
```

---

### `@quickstart/contracts`
RBAC ke liye single source of truth:
```typescript
WORKSPACE_PERMISSIONS.AGENT_PUBLISH  // "workspace.agent.publish"
WORKSPACE_PERMISSIONS.SECRET_WRITE   // "workspace.secret.write"
permissionsForRole("developer")      // returns array of allowed permissions
```

---

### `@quickstart/workspace-access`
```typescript
// Service mein kisi bhi route par permission check:
requirePermission(ctx, WORKSPACE_PERMISSIONS.AGENT_PUBLISH);
// Agar nahi hai -> 403 Forbidden throw
```

---

## 6. All Services — Port Map

| Port | Service | Role |
|------|---------|------|
| **:3000** | `gateway-service` | **Only public entry point** |
| :3001 | `identity-service` | Auth, users, orgs, API keys |
| :3002 | `workspace-service` | Workspaces, members, invites |
| :3003 | `agent-service` | Agent CRUD, versions, publish |
| :3004 | `conversation-service` | Conversations, messages |
| :3005 | `model-gateway` | LLM vendor calls (OpenAI etc.) |
| :3006 | `runtime-service` | Agent loop execution |
| :3007 | `web-fetch-service` | Scrape/crawl/search |
| :3009 | `knowledge-service` | RAG ingest + retrieval |
| :3010 | `memory-service` | Long-term user facts |
| :3011 | `secrets-service` | Encrypted credential vault |

---

## 7. Service-by-Service Guide

### `identity-service` (:3001)

**Kya karta hai:**
- User register/login
- JWT issue (access token + refresh token)
- Organization create/read
- API key management

**Key tables:**
- `users` — id, email, password_hash
- `refresh_tokens` — user_id, token_hash, expires_at
- `organizations` — id, name, owner_id
- `api_keys` — id, org_id, key_hash, name

**Flow:**
```
POST /v1/login -> check password -> issue JWT (15min) + refresh (7d)
POST /v1/refresh -> validate refresh token -> new JWT
GET /v1/me -> validate JWT -> return user profile
```

---

### `workspace-service` (:3002)

**Kya karta hai:**
- Workspace CRUD (ek org ke under multiple workspaces)
- Member management (add/remove/role update)
- Invite system
- Membership cache populate karna (Redis mein)

**Key tables:**
- `workspaces` — id, org_id, name, slug
- `workspace_memberships` — workspace_id, user_id, role, version
- `workspace_invites` — workspace_id, email, role, token, expires_at

**IDOR protection:**
Har query mein `workspace_id` mandatory filter:
```sql
SELECT * FROM agents WHERE id = $1 AND workspace_id = $2;
-- Agar $2 match nahi -> 404 (existence leak nahi hogi)
```

---

### `agent-service` (:3003)

**Kya karta hai:**
- Agent draft bana/update/delete karo
- Agent publish karo (frozen version create hoti hai)
- Version history dekho
- Do versions ka diff
- Rollback karo

**Key concept:**
Agent ek **draft** hai (editable). Publish karne par ek **immutable version** ban jaata hai. Runtime hamesha published version use karta hai, draft ko nahi.

```
Agent Draft (mutable)
    +-- publish() -> Version 1 (immutable snapshot)
                 -> Version 2
                 -> Version 3 (current)
                 -> rollback() -> Version 2 active
```

**Key tables:**
- `agents` — id, workspace_id, name, instructions, model_id
- `agent_versions` — id, agent_id, version_number, snapshot (JSON), published_at

---

### `conversation-service` (:3004)

**Kya karta hai:**
- Conversation create karo (ek agent se linked)
- Messages store karo (user + assistant)
- Idempotency: ek hi message dobara insert nahi hogi

**Key tables:**
- `conversations` — id, workspace_id, agent_id, channel, status
- `messages` — id, conversation_id, role (user/assistant/tool), content, idempotency_key

**Idempotency kaise kaam karta hai:**
```
Client sends POST /messages with idempotency_key: "abc123"
-> First call: insert + return 201
-> Retry with same key: return 200 (same message, no duplicate insert)
```

---

### `model-gateway` (:3005)

**Kya karta hai:**
- Runtime se LLM vendor ko call forward karta hai
- Multi-provider: OpenAI, Anthropic, Google Gemini, Mistral
- Token counting, error normalization
- Circuit breaker (agar vendor down ho)

**Kyon alag service:**
Runtime directly vendor SDK use nahi karta. Model gateway ek abstraction layer hai — provider change karo bina runtime code change kiye.

---

### `runtime-service` (:3006)

**Kya karta hai:**
- Ek conversation turn execute karta hai
- Published agent version load karta hai
- Memory facts fetch karta hai
- Knowledge RAG karta hai (relevant chunks)
- Tool calls handle karta hai
- Model gateway ko call karta hai
- Reply conversation service mein save karta hai

**Turn ka flow:**
```
POST /v1/workspaces/:id/conversations/:convId/turns
    1. Published agent version load karo
    2. Conversation history fetch karo (last N messages)
    3. Memory facts inject karo (system prompt mein)
    4. Knowledge RAG: relevant docs fetch (OpenSearch)
    5. System prompt + history -> model-gateway
    6. Response parse karo
    7. Tool calls? -> execute -> append result -> loop to step 6
    8. Final reply -> conversation-service mein save
```

---

### `web-fetch-service` (:3007)

**Kya karta hai:**
- URL scrape karo (single page)
- Website crawl karo (sitemap ya recursive)
- Web search karo (Serper/Tavily providers)

**Providers:** Olostep, Serper, etc. Service ke peeche providers hain, service ka naam nahi.

**Acquisition unit:** Har scrape/crawl page/search = 1 billable unit (Feature 26 ke liye log hota hai).

---

### `knowledge-service` (:3009)

**Kya karta hai:**
- Documents ingest karo (PDF, URL, text)
- Chunk karo -> embed karo -> OpenSearch mein index karo
- RAG query: "is topic ke relevant chunks do"

**Flow:**
```
POST /ingest (URL ya file)
    -> web-fetch-service ya file parse
    -> text chunks (512 tokens)
    -> embedding model (e.g. text-embedding-3-small)
    -> OpenSearch index (vector + metadata)

GET /search?q=user_question
    -> embed question
    -> ANN search in OpenSearch
    -> return top-K chunks
```

**Key tables:**
- `knowledge_sources` — id, workspace_id, type, url/filename, status
- `knowledge_chunks` — id, source_id, workspace_id, content, embedding_id

---

### `memory-service` (:3010)

**Kya karta hai:**
- User ke baare mein long-term facts store karo
- Runtime inject karta hai relevant facts system prompt mein

**Knowledge vs Memory:**

| | Memory | Knowledge |
|--|--------|-----------|
| Scope | User-specific facts | Workspace-wide documents |
| Example | "User prefers dark mode" | "Our refund policy is..." |
| Source | Per-conversation extraction | Manually ingested docs |
| Injected as | System prompt facts | RAG context chunks |

**Key tables:**
- `facts` — id, workspace_id, subject_id, content, confidence, source_conversation_id

---

### `secrets-service` (:3011)

**Kya karta hai:**
- API keys aur credentials encrypt karke store karo
- Internal services (runtime) ko plaintext reveal karo
- Key rotation support (zero downtime)

**Encryption: AES-256-GCM**
```
Store:
  value = "sk-openai-abc123"
  iv = crypto.randomBytes(12)          // 96-bit, random per call
  { authTag, ciphertext } = encrypt(ENCRYPTION_KEY, value)
  stored = base64(iv + authTag + ciphertext)

Retrieve (internal only):
  decode base64 -> split iv/authTag/ciphertext -> decrypt -> plaintext
```

**Public endpoints (via gateway):**
```
GET  /v1/workspaces/:id/secrets        -> list names only (NEVER values)
POST /v1/workspaces/:id/secrets        -> create (stores ciphertext)
DELETE /v1/workspaces/:id/secrets/:name -> delete
PUT  /v1/workspaces/:id/secrets/:name/rotate -> re-encrypt with new key
```

**Internal endpoint (NO gateway, internal token only):**
```
GET /_internal/workspaces/:id/secrets/:name/reveal
    Header: x-internal-token: <SECRETS_INTERNAL_TOKEN>
    -> returns { value: "sk-openai-abc123" }
```

---

## 8. Data Layer (Databases, Cache, Queues)

### PostgreSQL (:5433)
- **Shared schema** — sab services ek hi DB use karti hain
- Har row pe `workspace_id UUID NOT NULL` — tenant isolation
- **Migrations:** `make identity-migrate`, `make workspace-migrate`, etc.

```sql
-- Example: Tenant isolation pattern
CREATE TABLE agents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  instructions TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_agents_workspace ON agents(workspace_id);
```

**Production:** Aurora PostgreSQL + RDS Proxy

---

### Valkey/Redis (:6379)

1. **Membership cache** — workspace member check (Feature 09B)
```
Key: workspace:member:{workspaceId}:{userId}
Value: { role, permissions[] }
TTL: 5 minutes
```
Source of truth hamesha PostgreSQL hai. Cache sirf Postgres trips reduce karta hai at 10k req/s.

2. **Rate limiting** — gateway pe per-tenant limits
3. **Session/refresh token** metadata

**Production:** ElastiCache

---

### Kafka (:9092)
- Event streaming for async operations
- Topics: `agent.published`, `conversation.message.created`, `knowledge.chunk.indexed`
- Consumer groups: services apne relevant topics subscribe karti hain

**Production:** Amazon MSK

---

### OpenSearch (:9200)
- Vector store for knowledge RAG
- Index per workspace (ya shared index with workspace_id filter)
- ANN (Approximate Nearest Neighbor) search for semantic retrieval

**Production:** Amazon OpenSearch Service

---

### ElasticMQ / SQS (:9324)
- Queue for async jobs (knowledge ingest, email sends)
- Dead-letter queue for failed jobs

---

## 9. Multi-Tenancy & RBAC

### Tenancy Model

```
Organization (billing/legal entity)
+-- Workspace A    <- tenant_id = workspace_id
|   +-- Agents
|   +-- Conversations
|   +-- Knowledge bases
|   +-- Secrets
+-- Workspace B    <- different tenant_id
    +-- ...
```

**Rule:** `tenant_id` === `workspace_id`. Har operational table mein yeh column hai.

---

### 6 Workspace Roles

| Role | Kya kar sakta hai |
|------|------------------|
| **owner** | Sab kuch. Workspace delete bhi. |
| **admin** | Almost sab. Members manage, agents publish. |
| **developer** | Agents create/update/publish. Knowledge ingest. |
| **operator** | Live conversations monitor. Handoff trigger. |
| **analyst** | Read-only analytics aur conversations. |
| **human_agent** | Sirf conversations mein participate. |

**Key invariant:** Analyst `workspace.agent.publish` nahi kar sakta.

---

### Permission Strings Format

```
{domain}.{resource}.{action}

workspace.agent.create
workspace.agent.publish
workspace.member.invite
workspace.secret.write
workspace.knowledge.read
```

---

### TenantContext — Mandatory

```typescript
interface TenantContext {
  workspaceId: string;  // tenant
  actorId: string;      // logged-in user
}
```

Har repository method ko yeh context chahiye. Optional parameter nahi hai.

---

## 10. Auth Flow (Login -> JWT -> Request)

```
1. Client -> POST /v1/login (email + password)
   |
2. identity-service validates password
   |
3. Returns:
   - access_token (JWT, 15 min)
   - refresh_token (opaque, 7 days, stored in DB)
   |
4. Client -> GET /v1/workspaces/:id/agents
   Header: Authorization: Bearer <access_token>
   |
5. gateway-service verifies JWT signature
   - Invalid? -> 401 Unauthorized
   - Expired? -> 401, client must call /v1/refresh
   |
6. Gateway extracts { userId, orgId } from JWT
   - Looks up workspace membership (Redis cache first, then Postgres)
   - Attaches: x-quickstart-auth-context: base64(JSON)
   |
7. Proxies to agent-service
   |
8. agent-service reads auth context header
   - requirePermission(ctx, AGENT_READ) check
   - Queries DB: WHERE id = $1 AND workspace_id = $2
   |
9. Returns response
```

---

## 11. Request Lifecycle (Ek API Call Ka Safar)

**Example:** `GET /v1/workspaces/ws-abc/agents`

```
Client
  |
  v
gateway-service :3000
  +-- 1. Request ID assign (x-request-id)
  +-- 2. OTel trace start
  +-- 3. JWT verify
  +-- 4. Redis: workspace membership check
  +-- 5. Attach x-quickstart-auth-context header
  +-- 6. Proxy to agent-service :3003
           |
           v
       agent-service :3003
         +-- 1. Extract auth context
         +-- 2. requirePermission(AGENT_READ)
         +-- 3. DB query: SELECT * FROM agents WHERE workspace_id = $1
         +-- 4. Return JSON array
           |
           v
       gateway-service (response pass-through)
           |
           v
       Client <- 200 OK { agents: [...] }
```

**Middleware stack (har service mein):**
```
request_id -> tracing -> timeout -> body_limit -> rate_limit -> auth -> tenant -> route_handler
```

---

## 12. Agent Runtime — Conversation Turn

**POST `/v1/workspaces/:id/conversations/:convId/turns`** (via gateway -> runtime-service)

```
Runtime receives:
{
  agentId: "ag-xyz",
  userMessage: "What is our refund policy?"
}

Runtime executes:
  1. Load agent version (published snapshot from agent-service)
  2. Fetch conversation history (last 20 messages from conversation-service)
  3. Fetch memory facts (from memory-service for this user/conversation subject)
  4. RAG retrieval (from knowledge-service: top-5 relevant chunks)
  5. Build prompt:
     [System: agent instructions + memory facts + RAG chunks]
     [User: conversation history]
     [User: "What is our refund policy?"]
  6. Call model-gateway -> LLM response
  7. Tool call in response? -> execute tool -> append result -> loop to step 6
  8. Save assistant message to conversation-service
  9. Return { message: "..." }
```

---

## 13. Knowledge Ingest (RAG)

**Ek document ingest karne ka flow:**

```
POST /v1/workspaces/:id/knowledge/ingest
  { source: "https://docs.example.com/refund-policy" }

knowledge-service:
  1. web-fetch-service ko call karo -> full page text
  2. Text clean karo (remove HTML, nav, footer)
  3. Chunk karo (512 tokens, 50 token overlap)
  4. Each chunk embed karo (model-gateway via embedding model)
  5. OpenSearch mein index karo:
     {
       workspace_id: "ws-abc",
       source_id: "ks-123",
       chunk_index: 0,
       content: "Refund requests must be made within 30 days...",
       embedding: [0.023, -0.441, ...]  <- 1536-dim vector
     }
  6. knowledge_sources table mein status = "indexed"
```

**RAG Retrieval (runtime ke time):**
```
User asks: "What is refund policy?"
  -> embed question
  -> OpenSearch kNN search (top 5 closest vectors, workspace_id filter)
  -> return chunks as context to LLM
```

---

## 14. Memory Service

**Short-term vs Long-term:**

| | Short-term (Conversation History) | Long-term (Memory) |
|--|--|--|
| Where | `messages` table in conversation-service | `facts` table in memory-service |
| Scope | This conversation only | Across all conversations |
| Content | Full message log | Extracted facts |
| Injected | As chat history | As system prompt facts |

**Fact extraction example:**
```
Conversation: "I prefer Python over JavaScript for backend work."
-> Memory fact: { subject: user-123, content: "Prefers Python for backend", confidence: 0.9 }
```

---

## 15. Secrets Vault (Feature 16)

### Problem
Tool definitions mein API keys hote hain. Inhe plaintext store karna compliance blocker hai — logs, traces, exports mein leak ho jaate hain.

### Solution: AES-256-GCM Envelope Encryption

**Encryption detail:**
```
Master Key (ENCRYPTION_KEY env var) = 64-char hex = 32 bytes

Store secret:
  iv = random 12 bytes (96-bit)
  { authTag, ciphertext } = AES-256-GCM.encrypt(key, iv, plaintext)
  stored_value = base64( iv + authTag + ciphertext )

Retrieve:
  decoded = base64decode(stored_value)
  iv = decoded[0..11]
  authTag = decoded[12..27]
  ciphertext = decoded[28..]
  plaintext = AES-256-GCM.decrypt(key, iv, authTag, ciphertext)
```

**Why GCM (not CBC)?**
GCM = authenticated encryption. Tampered ciphertext -> authTag mismatch -> throws error. Integrity guaranteed without separate HMAC.

### Redaction Policy

| Surface | Rule |
|---------|------|
| List API response | Names only, NEVER values |
| Error messages | Nahi batana ki secret exist karta hai (NOT_FOUND, not FORBIDDEN) |
| Logs | Only `secret.created`, name. No values EVER. |
| Internal reveal | Only via `x-internal-token`, only for runtime |

### Key Rotation (Zero Downtime)

```
1. New ENCRYPTION_KEY generate karo, version bump karo
2. New pods deploy karo (rolling deploy)
3. PUT /rotate call karo per secret:
   -> Old pods: old key se decrypt
   -> New pods: new key se encrypt, same row update
4. Sab rows rotate hone ke baad old key remove karo
```

---

## 16. ADR Index (Architecture Decisions)

| ADR | Decision | Why |
|-----|----------|-----|
| 0001 | Monorepo + pnpm workspaces | Shared packages, coordinated deploys |
| 0002 | PostgreSQL shared schema | 10k+ tenants — separate DBs ka connection pool exhaust hoga |
| 0003 | `@quickstart/*` packages | Don't repeat middleware in 11 services |
| 0004 | JWT access + opaque refresh | Stateless verify, secure rotation |
| 0005 | `workspace_id` on every row | IDOR prevention at DB level |
| 0006 | Gateway as thin proxy | JWT + rate limit only, no business logic |
| 0007 | Agent draft + publish = version | Immutable runtime, safe rollback |
| 0008 | Idempotency keys on messages | Retry safety, no duplicate messages |
| 0009 | Version diffs | Track what changed between publishes |
| 0010 | Model gateway abstraction | Swap LLM vendor without touching runtime |
| 0011 | web-fetch as internal service | Crawl/scrape cost tracking, provider swap |
| 0012 | Redis membership cache | Postgres par 10k req/s -> bottleneck |
| 0013 | Chunking + embedding + OpenSearch | Semantic RAG at scale |
| 0014 | Separate memory service | User facts != workspace knowledge |
| 0015 | Tools + MCP integration | Agents external APIs call kar sakein |
| 0016 | AES-256-GCM vault | Plaintext credentials = compliance fail |

Full ADRs: `docs/adr/000X-*.md`

---

## 17. Feature Roadmap Status

| Feature | Name | Status |
|---------|------|--------|
| F01 | Engineering foundation | done |
| F02 | Local data plane | done |
| F03 | Shared libraries | done |
| F04 | Identity | done |
| F05 | Workspace & roles | done |
| F06 | API gateway | done |
| F07 | Agent drafts | done |
| F08 | Agent versions & publish | done |
| F09 | Conversation service | done |
| F09B | Membership cache (Redis) | done |
| F10 | Model gateway | done |
| F10B | Web fetch service | done |
| F11 | Knowledge ingest (RAG) | done |
| F12 | Agent runtime (chat turns) | done |
| F13 | RAG retrieval in runtime | done |
| F14 | Memory service | done |
| F15 | Tools & MCP | done |
| **F16** | **Secrets vault** | **done** |
| F17 | Website chat widget | not started |
| F18 | Inbox & human handoff | not started |
| F19 | Event platform | not started |
| F20 | Workflow automation | not started |
| F21 | Voice path (WebRTC/SIP) | not started |
| F21B | Speech providers (STT/TTS) | not started |
| F22 | Voice reliability | not started |
| F21C | Telephony (CPaaS: Twilio/Telnyx) | not started |
| F23 | Campaigns | not started |

---

## 18. Key Patterns to Know

### Pattern 1: Fail-Closed IDOR Prevention
```typescript
// WRONG — existence leak
if (secret.workspaceId !== ctx.workspaceId) throw new AppError(ErrorCode.FORBIDDEN, ...);

// RIGHT — no information leak
const secret = await repo.getByName(ctx.workspaceId, name); // workspace_id in SQL
if (!secret) throw new AppError(ErrorCode.NOT_FOUND, "not found");
```

### Pattern 2: No Business Logic at Gateway
```
Gateway kya karta hai: JWT verify -> membership cache -> proxy
Gateway kya NAHI karta: agent config read, model call, DB query
```

### Pattern 3: Idempotency
```typescript
// Client sends same request twice (network retry)
POST /messages { content: "Hello", idempotency_key: "req-xyz-123" }
// First: INSERT ... ON CONFLICT (idempotency_key) DO NOTHING -> 201
// Second: same key -> SELECT existing -> 200 (same response, no duplicate)
```

### Pattern 4: Immutable Versions
```
Publish karo -> new version (frozen JSON snapshot of agent config)
Agent draft ko update karo -> version nahi badlti
Runtime hamesha latest published version use karta hai
Rollback = previous version ko "active" mark karna
```

### Pattern 5: Internal-Only Routes
```
Public gateway pe sirf client-facing routes hain
Internal routes (e.g. /reveal) sirf service-to-service
Authentication: x-internal-token header (shared secret)
Gateway pe yeh routes registered hi nahi hain
```

### Pattern 6: Structured Logging
```typescript
logger.info({ event: "secret.created", name: secret.name, workspaceId });
// NEVER:
logger.info({ event: "secret.created", value: plaintext }); // WRONG
```

---

## 19. Glossary

| Term | Meaning |
|------|---------|
| **Organization** | Company-level account. Billing, users, legal boundary. |
| **Workspace** | Project inside an org. Agents, conversations, knowledge live here. `tenant_id = workspace_id`. |
| **Tenant** | Code mein workspace_id. Har row pe hona zaroori hai. |
| **Gateway** | `:3000` — single public HTTP door. JWT check + proxy. |
| **Agent** | Mutable draft: name, instructions, model config. |
| **Version** | Immutable frozen snapshot of agent at publish time. |
| **Conversation** | Stored chat thread (ordered messages in Postgres). |
| **Turn** | One user message -> runtime executes -> one assistant reply. |
| **Model gateway** | Our proxy to LLM vendors (OpenAI, Anthropic, etc.). |
| **Web fetch** | `web-fetch-service` — scrape, crawl, search. Providers are behind it. |
| **Acquisition unit** | 1 billable unit of web fetch (1 scrape, 1 crawl page, 1 search). |
| **Runtime** | Loop: load agent version -> chat history -> RAG -> model -> tool calls -> reply. |
| **Idempotency key** | Client-supplied ID so retries don't create duplicates. |
| **Optimistic concurrency** | Update only if `version` matches last known value. If not -> 409 Conflict. |
| **IDOR** | Insecure Direct Object Reference: accessing another tenant's data via their ID. |
| **Envelope encryption** | Master key encrypts data keys (or data directly). KMS can replace master key later without schema change. |
| **AES-256-GCM** | Symmetric authenticated encryption. 256-bit key, GCM mode = integrity + confidentiality. |
| **TenantContext** | `{ workspaceId, actorId }` — passed to every repo method. Mandatory. |
| **RBAC** | Role-Based Access Control. Permissions assigned to roles, roles assigned to users. |
| **ADR** | Architecture Decision Record. Explains WHAT we decided and WHY. |
| **Membership cache** | Redis cache of workspace member role+permissions to avoid Postgres on every request. |
| **Horizontal scale** | More pods/replicas of same service. |
| **Vertical scale** | More CPU/RAM for one pod. Does NOT fix in-memory state bugs. |
| **Fail-closed** | On any error/uncertainty, deny access (don't assume allowed). |

---

*Last updated: October 2026 | Feature 16 (Secrets Vault) complete*
