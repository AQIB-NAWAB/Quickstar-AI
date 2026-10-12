# Learning guide — Request lifecycle (client to answer)

This guide follows **one real request** through QuickStart. The request is a chat turn:

```http
POST /v1/workspaces/{workspaceId}/conversations/{conversationId}/turns
Authorization: Bearer <access_jwt>
Idempotency-Key: <client key>
Content-Type: application/json

{"message":"What is our refund policy?"}
```

A login is a shorter trip (gateway → identity → Postgres). A turn is the long trip, so this is the one to learn first. Section 11 tells the same story again in one sitting, without the tables.

**Code this follows:** gateway `proxy-runtime.routes.ts`, `protected-workspace-proxy.ts`, `proxy.ts`, runtime `turns.routes.ts`, `turns.service.ts`.

---

## 1. The levels, before any business logic

Think of the request as crossing **levels**. Each level has one job. If you skip a level in your head, the system will look magical.

| Level | Who | What it is allowed to do |
| --- | --- | --- |
| 0 | Your app or `curl` | Build HTTP, keep the JWT and the idempotency key |
| 1 | DNS and TCP | Turn the hostname into an IP and open a connection |
| 2 | TLS load balancer (production) | Decrypt HTTPS, pick a gateway replica, set `X-Forwarded-For` |
| 3 | **Gateway :3000** | Rate limit, JWT, membership, proxy. No database of messages. |
| 4 | **Runtime :3006** | Run the turn. Call other services. Do not call the LLM vendor itself. |
| 5 | Domain services | Conversation, agent, knowledge, memory. Each owns its tables. |
| 6 | **Model gateway :3005** | The only service that talks to the model vendor |
| 7 | Vendor (OpenAI or the fake profile) | Tokens in, text out. Not part of our tenant database |
| 8 | Back the same path | Runtime writes the assistant message, gateway copies the JSON, client reads it |

On a laptop there is often **no** level 2. You call `127.0.0.1:3000` in clear HTTP. The rest of the levels still exist as processes.

---

## 2. Level 0 — The client

The client must already have an **access JWT** from `POST /v1/login` or `POST /v1/register`. That token is a signed string. It contains `sub` (user id), `org_id`, and `sid` (session id). It is not a session stored on the gateway.

The client should send an **idempotency key**. If the network dies after the server saved the turn, the client retries with the **same** key. The conversation service then returns the existing row instead of inserting a second user message. If the client omits the key, the runtime generates a random UUID, and a retry looks like a **new** turn.

The client does **not** choose the model, the published prompt, or another tenant’s workspace by putting those in hidden fields and hoping. The URL contains `workspaceId`. The token contains the user. The services check that this user may act in that workspace.

---

## 3. Level 1 and 2 — Network and TLS

**DNS** resolves `api.yourdomain.com` to the load balancer, not to a runtime pod.

**TCP** connects to port 443 in production, or port 3000 on your laptop.

**TLS** ends at the load balancer. The Node gateway often sees plain HTTP on the private network. The load balancer should set `X-Forwarded-For` to the real client IP. The gateway rate limiter uses the first address in that header. If you expose the gateway without a trusted proxy, a client can invent that header and dodge the per-IP budget.

The load balancer picks **one** gateway replica. The next request may hit **another** replica. That is safe because the gateway does not keep the chat in memory.

---

## 4. Level 3 — Inside the gateway process

The socket is accepted by Express listening on `0.0.0.0:3000`. Middleware runs in order. Nothing here writes the chat.

### 4.1 Platform middleware

1. **Request id.** If the client did not send one, the platform creates `x-request-id`. Every later log line for this turn should carry that id.
2. **Tracing.** A span starts for the gateway hop.
3. **Timeout.** Default about 30 seconds for the whole gateway handling of this request, including the time spent waiting on runtime.
4. **JSON parse.** The body becomes `req.body`. A huge body is rejected before proxying. Default limit is about 1 MB.

### 4.2 Redis rate limit

Key shape: `gateway:rl:{clientIp}:{time bucket}`.

Redis `INCR`s the key. The first increment sets an expiry (the window, default 60 seconds). If the count is above the max (default 300), the gateway returns **429** and **stops**. Runtime is never called.

If Redis throws, the gateway returns **503** “Rate limit store unavailable” and **stops**. It does not skip the limit.

`/healthz` skips this step. This turn does not.

### 4.3 Route match

`POST /v1/workspaces/:workspaceId/conversations/:conversationId/turns` is registered in `proxy-runtime.routes.ts`. It uses the protected workspace chain:

1. Verify the JWT signature and expiry with `JWT_ACCESS_SECRET`.
2. Resolve workspace membership.
3. Proxy to `RUNTIME_URL` (default `http://127.0.0.1:3006`).

A bad JWT returns **401** here. Runtime is not called.

Membership uses Redis key `qs:membership:v1:{workspaceId}:{userId}` when the cache is warm. On a miss, the gateway calls **workspace-service**. If the user is not a member, the turn stops with the error workspace returned (typically forbidden). The gateway does **not** check the permission string `CONVERSATION_PARTICIPATE`. Runtime checks that next. So membership at the gateway means “this user belongs in this workspace,” not “this user may run a turn.”

### 4.4 The proxy hop

`proxyToUpstream` builds:

```text
http://runtime:3006/v1/workspaces/{workspaceId}/conversations/{conversationId}/turns
```

It forwards the path, the query, and a JSON body. It does **not** retry (`maxRetries: 0`). It sets:

- `x-request-id` (same id)
- `Authorization: Bearer <same jwt>`
- `x-quickstart-auth-context` with `actorId` = JWT `sub`, `tenantId` = JWT `org_id`, `roles` = empty, `requestId` = the same id

Hop-by-hop headers such as `Host` and `Content-Length` are dropped and recomputed.

The gateway then **waits**. It does not run the model. If runtime never answers before the timeout, the client gets **504** `UPSTREAM_TIMEOUT` or **503** if the connection failed. The runtime might still finish the database write after the client gave up. That is why the idempotency key exists.

---

## 5. Level 4 — Inside the runtime process

Runtime listens on **3006**. It has its own copy of platform middleware (request id, trace, timeout, JSON, its own rate limit). The body is parsed **again**. That is normal. Gateway and runtime are two servers.

### 5.1 Route guards (`turns.routes.ts`)

Order on this route:

1. **Auth middleware.** Reads the Bearer token again (and the actor id for locals).
2. **Tenant middleware.** Reads `workspaceId` from the URL. It must be a UUID. It stores `res.locals.tenantContext = { workspaceId, actorId }`.
3. **Permission `CONVERSATION_PARTICIPATE`.** Workspace-access client, cache then HTTP. A member without this permission does not get a turn.
4. **Permission `TOOLS_RUN`.** The route requires this even when this particular agent has no tools, because the turn handler is allowed to enter the tool loop. A role without `TOOLS_RUN` is rejected here.
5. **Controller** `executeTurn`.

The controller reads `message` or `text`, and the idempotency key from the `Idempotency-Key` header or `idempotency_key` in the body. It copies `authorization`, the auth-context header, and `x-request-id` into `authHeaders` for every downstream call.

### 5.2 Turn steps (`TurnsService.executeTurn`)

These are separate HTTP calls. They are not one database transaction across services.

**Step A — Load the conversation.**  
`conversation-service` (`:3004`). If this workspace does not own that conversation, the client gets **404**. The runtime learns `agent_id` and optional `subject_key` (used for memory).

**Step B — Load the agent.**  
`agent-service` (`:3003`). The runtime reads `production_version_id`. If nothing is published, it returns **409** “Agent has no published version”. It does **not** use the draft row. A draft edit during the call does not change this turn.

**Step C — Load the immutable version.**  
Same agent service. Instructions, model settings, and tool definitions come from the **snapshot** frozen at publish time.

**Step D — Append the user message.**  
Conversation service again, with `idempotency_key` = the client key, `sender_type` = `user`, `sender_id` = the actor id.

If this key was already stored, the result is `deduplicated: true`. The runtime looks for an assistant message whose key is `{idempotencyKey}:asst`. If that assistant row already exists, the runtime **returns immediately** with **200** and does not call the model again. If the user row exists but the assistant row does not (crash in the middle last time), the runtime continues and tries to finish the turn.

**Step E — Load recent history.**  
Up to 50 messages, sorted by `seq`.

**Step F — Knowledge (optional).**  
If a knowledge client is wired and the user text is non-empty, runtime asks knowledge-service how many sources are ready. If the count is above zero, it retrieves up to 5 chunks and keeps at most **4000 characters**. Chunk ids are remembered so they can be stored on the assistant message metadata. This hop talks to OpenSearch inside knowledge-service. The gateway never sees OpenSearch.

**Step G — Memory (optional).**  
If the conversation has a `subject_key` and a memory client exists, runtime loads up to 20 facts and keeps at most **2000 characters**. The prompt labels them as user facts, not as instructions.

**Step H — Build the model messages.**  
One system message if there are instructions, knowledge, or facts. Then history as `user` or `assistant`. The current user text is appended if it is not already in that list.

**Step I — Model, or tools then model.**  
If the snapshot has tools and a tool loop is wired, `toolLoop.run` calls the **model gateway** with tool definitions, may call HTTP or MCP tools, and may call the model again. Each tool call is recorded through the conversation service. If there are no tools, runtime calls `modelGatewayClient.complete` once.

The model gateway is **:3005**. It is **not** on the public gateway route table. Only runtime (and similar internal callers) should reach it. The vendor API key stays there, not in the browser and not in the gateway.

**Step J — Append the assistant message.**  
Idempotency key `{idempotencyKey}:asst`, `sender_type` = `assistant`, `sender_id` = the **version id** (so you know which frozen prompt spoke). Metadata may include `retrieved_chunk_ids`.

**Step K — HTTP response.**  
Runtime returns **201** if this was the first completion, or **200** if step D found a finished duplicate. Body shape:

```json
{
  "request_id": "...",
  "turn": {
    "deduplicated": false,
    "conversation_id": "...",
    "agent_id": "...",
    "agent_version_id": "...",
    "user_message": {},
    "assistant_message": {},
    "usage": {}
  }
}
```

---

## 6. Level 5 and 6 — What those inner services do

You do not need every SQL line on the first reading. You do need to know **who may write what**.

| Hop | Service | Writes? | Why it can say no |
| --- | --- | --- | --- |
| Get conversation | conversation :3004 | No | Wrong workspace → not found |
| Get agent / version | agent :3003 | No | No production pointer → runtime turns that into 409 |
| Append user message | conversation :3004 | Yes, one row | Same idempotency key → return old row |
| Ready count / retrieve | knowledge :3009 | No on the turn path | No ready sources → skip retrieval |
| List facts | memory :3010 | No | No `subject_key` → skip |
| Complete / tools | model-gateway :3005 | No tenant chat row | Vendor timeout, bad profile, tool error |
| Append assistant | conversation :3004 | Yes, one row | Same assistant idempotency key → return old row |

Workspace permission checks may call workspace-service or hit Redis. They do not insert the message.

Postgres for messages lives **behind conversation-service**. Postgres for agents lives **behind agent-service**. The runtime process does not open those tables itself. That is why a turn is many network hops, and why a timeout at the gateway does not automatically roll back a user message that was already committed in step D.

---

## 7. Level 7 — The model vendor

The model gateway turns our JSON (`messages`, `model`, `workspace_id`, `request_id`) into the vendor’s HTTP API, or into the local **fake** profile when the snapshot says `profile: "fake"`.

The vendor does not know our `workspace_id` unless we send it as an opaque metadata field. Our tenant wall is **our** services, not the vendor. A bug that omits `workspace_id` on a conversation query is our bug. A bug that sends customer text to the vendor is expected. That text should already have been limited to what this workspace is allowed to retrieve.

Token usage comes back on the completion object when the non-tool path is used. Billing (Feature 26) is **not** on this request. The turn returns usage to the client. A later consumer is supposed to turn that into a ledger row so the request path stays short.

---

## 8. Level 8 — The way back

Runtime finishes `sendPlatformJson`. The gateway is still waiting on `fetch`. It reads the status and the body text and sends them to the load balancer, which encrypts them again if TLS ended there. The client parses `turn.assistant_message`.

Logs on gateway, runtime, conversation, agent, and model gateway should share **`x-request-id`**. If you only have the gateway log, you cannot see which chunk retrieval was slow. If you only have the vendor dashboard, you cannot see which workspace was billed in our system.

---

## 9. Failure along the way (same request, different endings)

| Where it stops | Client result | What may already be saved |
| --- | --- | --- |
| Rate limit | 429 | Nothing |
| Bad JWT at gateway | 401 | Nothing |
| Not a workspace member | 403 (or workspace’s code) | Nothing |
| Runtime permission missing | 403 | Nothing |
| Conversation not in this workspace | 404 | Nothing |
| Agent not published | 409 | Nothing |
| User message saved, then model times out | 504/503 from gateway or error from runtime | User row may exist. Retry with the **same** idempotency key continues or returns the assistant if it was saved |
| Full success, client retries | 200 `deduplicated: true` | No second model call if the assistant row is already there |

There is **no** distributed transaction that undoes the user message when the model fails. The idempotency key is the recovery tool.

---

## 10. What this lifecycle is not

- It is not a voice call. Voice would enter **voice-service** later, run speech-to-text, then call this **same** runtime turn, then run text-to-speech. The gateway would still not hold the audio socket.
- It is not a direct call to port 3006 from the public internet. Production should block that. The checks at the gateway (rate limit and membership) are part of the edge. Runtime repeats auth and permissions because the network is not a substitute for a check.
- It is not 10,000 model calls per second. The 10,000 requests per second budget is for short gateway work. This turn is a **heavy** request: many hops plus a vendor call.

---

## 11. The same lifecycle, told again

Read this section after section 4–8. It is the same turn, in order, as a story.

A person presses send. Their app already holds a short-lived JWT from login. The app sends one POST to the public host, with the workspace id and the conversation id in the path, the user sentence in JSON, and an idempotency key so a retry is safe.

DNS and the load balancer land that TCP connection on **one** gateway replica. The gateway gives the request an id, parses the JSON, and asks Redis whether this client IP is still inside the rate budget. If Redis is down, the journey ends with 503. If the budget is spent, it ends with 429. The model is not involved yet.

The path matches the turn route. The gateway checks the JWT signature. It then asks, through a short Redis cache or through workspace-service, whether this user is a member of the workspace in the URL. If not, the journey ends. If yes, the gateway opens a **second** HTTP call to the runtime process, copies the body, copies the Bearer token, and adds an auth-context header that names the user. It does not retry that call.

Runtime parses the body again. It checks the token, checks that the workspace id is a UUID, and checks two permissions: participate in conversations, and run tools. Then the turn service walks outward. It loads the conversation from the conversation service and learns which agent is attached. It loads the agent and refuses to continue if nothing has been published. It loads the frozen version, so the prompt and the tools are the published snapshot, not today’s draft. It writes the user message. If that write says the key was already used and the assistant reply is already stored, runtime returns 200 and the gateway copies that back. The model is not called.

If the turn is new, runtime loads recent messages. It may ask knowledge-service for a few chunks and memory-service for a few facts, and it glues those into a system message with a size cap. It calls the model gateway, which is the only hop that leaves our network toward a model vendor, unless a tool loop also calls an HTTP or MCP tool in the middle. When text comes back, runtime writes the assistant message under a second idempotency key, including chunk ids when retrieval ran. It returns 201.

The gateway, which has been waiting the whole time, copies the status and the JSON to the load balancer. The app shows the assistant text. Every service that participated can be tied together later with the same request id. If the client never got the response but the assistant row was saved, the next send with the same idempotency key becomes a short trip that stops after the conversation read, and the user does not pay for a second model call.

---

## 12. Self-check

1. Why does the client send the request to port 3000 and not to port 3006?  
2. What does the gateway write to its own database during a turn?  
3. At which step can a user message exist even though the client saw a timeout?  
4. Why does runtime read `production_version_id` instead of the draft?  
5. Which service is allowed to call the model vendor?  
6. What is the difference between the gateway membership check and `CONVERSATION_PARTICIPATE`?  
7. Why is a retry with the same idempotency key not always a second model call?  
8. Why do gateway logs and runtime logs need the same `x-request-id`?

---

## 13. Card

```text
Client → TLS/LB → gateway:3000
  request id, JSON, Redis rate limit
  JWT, membership cache or workspace HTTP
  proxy, no retry → runtime:3006
    permissions CONVERSATION_PARTICIPATE + TOOLS_RUN
    conversation → agent version snapshot
    append user message (idempotency)
    maybe knowledge + memory
    model-gateway:3005 → vendor
    append assistant message
  gateway copies status + body → client
```
