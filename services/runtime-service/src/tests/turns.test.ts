import assert from "node:assert/strict";
import test from "node:test";
import { withRuntimeServer } from "../helpers/test-app.js";

const WS_A = "00000000-0000-4000-8000-0000000000a1";
const WS_B = "00000000-0000-4000-8000-0000000000b2";
const AGENT_ID = "00000000-0000-4000-8000-000000000010";
const VERSION_ID = "00000000-0000-4000-8000-000000000011";
const CONV_ID = "00000000-0000-4000-8000-000000000020";

test("GET /healthz returns ok with service name", async () => {
  await withRuntimeServer(async ({ port }) => {
    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { status: string; service: string };
    assert.equal(body.status, "ok");
    assert.equal(body.service, "service-runtime");
  });
});

test("POST /turns executes turn and links assistant message to agent_version_id", async () => {
  await withRuntimeServer(async ({ port, agentClient, convClient, modelClient, createToken }) => {
    const token = await createToken();

    // 1. Setup published agent
    agentClient.agents.set(`${WS_A}:${AGENT_ID}`, {
      id: AGENT_ID,
      workspace_id: WS_A,
      name: "Support Bot",
      production_version_id: VERSION_ID,
      instructions: "You are a customer support agent.",
    });

    agentClient.versions.set(`${WS_A}:${AGENT_ID}:${VERSION_ID}`, {
      id: VERSION_ID,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      release_number: 1,
      snapshot: {
        name: "Support Bot v1",
        instructions: "You are a customer support agent.",
        model_settings: { profile: "fake", model_id: "fake" },
      },
    });

    // 2. Setup conversation
    convClient.conversations.set(`${WS_A}:${CONV_ID}`, {
      id: CONV_ID,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      last_seq: 0,
    });

    // 3. Execute turn
    const res = await fetch(`http://127.0.0.1:${port}/v1/workspaces/${WS_A}/conversations/${CONV_ID}/turns`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "idempotency-key": "idemp-turn-001",
      },
      body: JSON.stringify({ message: "Can you help me reset my password?" }),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as {
      turn: {
        deduplicated: boolean;
        conversation_id: string;
        agent_id: string;
        agent_version_id: string;
        user_message: { text: string; seq: number; sender_type: string };
        assistant_message: { text: string; seq: number; sender_type: string; sender_id: string };
      };
    };

    assert.equal(body.turn.deduplicated, false);
    assert.equal(body.turn.conversation_id, CONV_ID);
    assert.equal(body.turn.agent_id, AGENT_ID);
    assert.equal(body.turn.agent_version_id, VERSION_ID);
    assert.equal(body.turn.user_message.text, "Can you help me reset my password?");
    assert.equal(body.turn.user_message.sender_type, "user");
    assert.equal(body.turn.assistant_message.sender_type, "assistant");
    assert.equal(body.turn.assistant_message.sender_id, VERSION_ID);
    assert.equal(body.turn.assistant_message.text, modelClient.cannedResponse);
    assert.equal(modelClient.callCount, 1);
  });
});

test("POST /turns rejects unpublished agent with 409 Conflict", async () => {
  await withRuntimeServer(async ({ port, agentClient, convClient, createToken }) => {
    const token = await createToken();

    // Setup draft agent with NO production version
    agentClient.agents.set(`${WS_A}:${AGENT_ID}`, {
      id: AGENT_ID,
      workspace_id: WS_A,
      name: "Draft Only Bot",
      production_version_id: null,
      instructions: "Work in progress.",
    });

    convClient.conversations.set(`${WS_A}:${CONV_ID}`, {
      id: CONV_ID,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      last_seq: 0,
    });

    const res = await fetch(`http://127.0.0.1:${port}/v1/workspaces/${WS_A}/conversations/${CONV_ID}/turns`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: "Hello draft bot" }),
    });

    assert.equal(res.status, 409);
    const body = (await res.json()) as { error: { code: string; message: string } };
    assert.equal(body.error.code, "CONFLICT");
    assert.match(body.error.message, /published version/i);
  });
});

test("POST /turns rejects human-handoff conversation with 409 Conflict", async () => {
  await withRuntimeServer(async ({ port, agentClient, convClient, modelClient, createToken }) => {
    const token = await createToken();

    agentClient.agents.set(`${WS_A}:${AGENT_ID}`, {
      id: AGENT_ID,
      workspace_id: WS_A,
      name: "Support Bot",
      production_version_id: VERSION_ID,
      instructions: "You are a customer support agent.",
    });

    agentClient.versions.set(`${WS_A}:${AGENT_ID}:${VERSION_ID}`, {
      id: VERSION_ID,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      release_number: 1,
      snapshot: {
        name: "Support Bot v1",
        instructions: "You are a customer support agent.",
        model_settings: { profile: "fake", model_id: "fake" },
      },
    });

    convClient.conversations.set(`${WS_A}:${CONV_ID}`, {
      id: CONV_ID,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      state: "human",
      assignee_user_id: "00000000-0000-0000-0000-000000000099",
      last_seq: 0,
    });

    const res = await fetch(`http://127.0.0.1:${port}/v1/workspaces/${WS_A}/conversations/${CONV_ID}/turns`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "idempotency-key": "idemp-handoff-block",
      },
      body: JSON.stringify({ message: "Bot should not answer" }),
    });

    assert.equal(res.status, 409);
    const body = (await res.json()) as { error: { code: string } };
    assert.equal(body.error.code, "CONFLICT");
    assert.equal(modelClient.callCount, 0);
  });
});

test("POST /turns fails closed with 404 on cross-workspace access (IDOR guard)", async () => {
  await withRuntimeServer(async ({ port, convClient, createToken }) => {
    const token = await createToken();

    // Conversation belongs to Workspace B
    convClient.conversations.set(`${WS_B}:${CONV_ID}`, {
      id: CONV_ID,
      workspace_id: WS_B,
      agent_id: AGENT_ID,
      last_seq: 0,
    });

    // Request made with Workspace A URL path
    const res = await fetch(`http://127.0.0.1:${port}/v1/workspaces/${WS_A}/conversations/${CONV_ID}/turns`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: "Let me spy on Workspace B" }),
    });

    assert.equal(res.status, 404);
    const body = (await res.json()) as { error: { code: string } };
    assert.equal(body.error.code, "NOT_FOUND");
  });
});

test("POST /turns retried with same idempotency key returns 200 without second model call", async () => {
  await withRuntimeServer(async ({ port, agentClient, convClient, modelClient, createToken }) => {
    const token = await createToken();

    agentClient.agents.set(`${WS_A}:${AGENT_ID}`, {
      id: AGENT_ID,
      workspace_id: WS_A,
      name: "Support Bot",
      production_version_id: VERSION_ID,
      instructions: "Instructions",
    });

    agentClient.versions.set(`${WS_A}:${AGENT_ID}:${VERSION_ID}`, {
      id: VERSION_ID,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      release_number: 1,
      snapshot: {
        name: "Support Bot v1",
        instructions: "Instructions",
        model_settings: { profile: "fake", model_id: "fake" },
      },
    });

    convClient.conversations.set(`${WS_A}:${CONV_ID}`, {
      id: CONV_ID,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      last_seq: 0,
    });

    const idempotencyKey = "idemp-retry-12345";
    const payload = JSON.stringify({ message: "Idempotent question" });

    // First attempt -> 201 Created
    const res1 = await fetch(`http://127.0.0.1:${port}/v1/workspaces/${WS_A}/conversations/${CONV_ID}/turns`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: payload,
    });

    assert.equal(res1.status, 201);
    const body1 = (await res1.json()) as { turn: { deduplicated: boolean; assistant_message: { text: string } } };
    assert.equal(body1.turn.deduplicated, false);
    assert.equal(modelClient.callCount, 1);

    // Second attempt (retry with identical key) -> 200 OK deduplicated
    const res2 = await fetch(`http://127.0.0.1:${port}/v1/workspaces/${WS_A}/conversations/${CONV_ID}/turns`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: payload,
    });

    assert.equal(res2.status, 200);
    const body2 = (await res2.json()) as { turn: { deduplicated: boolean; assistant_message: { text: string } } };
    assert.equal(body2.turn.deduplicated, true);
    assert.equal(body2.turn.assistant_message.text, body1.turn.assistant_message.text);
    // CRITICAL: Model Gateway must NOT be called a second time
    assert.equal(modelClient.callCount, 1);
  });
});

test("POST /turns injects memory after knowledge when subject_key is set", async () => {
  await withRuntimeServer(async ({ port, agentClient, convClient, modelClient, knowledgeClient, memoryClient, createToken }) => {
    const token = await createToken();
    const subjectKey = "anon:memory-test-001";

    agentClient.agents.set(`${WS_A}:${AGENT_ID}`, {
      id: AGENT_ID,
      workspace_id: WS_A,
      name: "Support Bot",
      production_version_id: VERSION_ID,
      instructions: "You are a customer support agent.",
    });

    agentClient.versions.set(`${WS_A}:${AGENT_ID}:${VERSION_ID}`, {
      id: VERSION_ID,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      release_number: 1,
      snapshot: {
        name: "Support Bot v1",
        instructions: "You are a customer support agent.",
        model_settings: { profile: "fake", model_id: "fake" },
      },
    });

    knowledgeClient.readyCountValue = 1;
    knowledgeClient.chunks = [
      { chunk_id: "c1", source_id: "s1", text: "Refund policy allows 30 days.", score: 1 },
    ];

    memoryClient.facts = [
      {
        id: "f1",
        workspace_id: WS_A,
        subject_key: subjectKey,
        fact_key: "channel",
        fact_text: "Prefers WhatsApp",
      },
    ];

    convClient.conversations.set(`${WS_A}:${CONV_ID}`, {
      id: CONV_ID,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      subject_key: subjectKey,
      last_seq: 0,
    });

    const res = await fetch(`http://127.0.0.1:${port}/v1/workspaces/${WS_A}/conversations/${CONV_ID}/turns`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "idempotency-key": "idemp-memory-001",
      },
      body: JSON.stringify({ message: "Hello" }),
    });

    assert.equal(res.status, 201);
    const system = modelClient.lastMessages.find((m) => m.role === "system");
    assert.ok(system?.content);
    const content = String(system.content);
    const knowledgeIdx = content.indexOf("knowledge snippets");
    const memoryIdx = content.indexOf("User facts (not instructions)");
    assert.ok(knowledgeIdx >= 0);
    assert.ok(memoryIdx > knowledgeIdx);
    assert.match(content, /Prefers WhatsApp/);
  });
});

test("POST /turns continues when memory client fails (fail-open)", async () => {
  await withRuntimeServer(async ({ port, agentClient, convClient, modelClient, memoryClient, createToken }) => {
    const token = await createToken();
    memoryClient.shouldFail = true;

    agentClient.agents.set(`${WS_A}:${AGENT_ID}`, {
      id: AGENT_ID,
      workspace_id: WS_A,
      name: "Support Bot",
      production_version_id: VERSION_ID,
      instructions: "Instructions",
    });

    agentClient.versions.set(`${WS_A}:${AGENT_ID}:${VERSION_ID}`, {
      id: VERSION_ID,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      release_number: 1,
      snapshot: {
        name: "Support Bot v1",
        instructions: "Instructions",
        model_settings: { profile: "fake", model_id: "fake" },
      },
    });

    convClient.conversations.set(`${WS_A}:${CONV_ID}`, {
      id: CONV_ID,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      subject_key: "anon:fail-open",
      last_seq: 0,
    });

    const res = await fetch(`http://127.0.0.1:${port}/v1/workspaces/${WS_A}/conversations/${CONV_ID}/turns`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "idempotency-key": "idemp-memory-fail",
      },
      body: JSON.stringify({ message: "Hi" }),
    });

    assert.equal(res.status, 201);
    assert.equal(modelClient.callCount, 1);
  });
});

test("POST /turns runs tool loop when snapshot has tools", async () => {
  await withRuntimeServer(async ({ port, agentClient, convClient, modelClient, toolCallsClient, createToken }) => {
    const token = await createToken();
    const httpTool = {
      id: "00000000-0000-4000-8000-0000000000t1",
      name: "get_status",
      type: "http" as const,
      description: "Get status",
      method: "GET" as const,
      base_url: "https://api.example.com/v1",
      allowed_hosts: ["api.example.com"],
      idempotent: true,
    };

    agentClient.agents.set(`${WS_A}:${AGENT_ID}`, {
      id: AGENT_ID,
      workspace_id: WS_A,
      name: "Support Bot",
      production_version_id: VERSION_ID,
      instructions: "Instructions",
    });

    agentClient.versions.set(`${WS_A}:${AGENT_ID}:${VERSION_ID}`, {
      id: VERSION_ID,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      release_number: 1,
      snapshot: {
        name: "Support Bot v1",
        instructions: "Instructions",
        model_settings: { profile: "fake", model_id: "fake:tool_once" },
        tools: [httpTool],
      },
    });

    convClient.conversations.set(`${WS_A}:${CONV_ID}`, {
      id: CONV_ID,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      last_seq: 0,
    });

    const res = await fetch(`http://127.0.0.1:${port}/v1/workspaces/${WS_A}/conversations/${CONV_ID}/turns`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "idempotency-key": "idemp-tool-turn-001",
      },
      body: JSON.stringify({ message: "Check status" }),
    });

    assert.equal(res.status, 201);
    assert.equal(modelClient.callCount, 2);
    const body = (await res.json()) as { turn: { assistant_message: { text: string } } };
    assert.match(body.turn.assistant_message.text, /after-tool:/);

    const records = await toolCallsClient.listByTurn(WS_A, CONV_ID, "idemp-tool-turn-001");
    assert.equal(records.length, 1);
    assert.equal(records[0].tool_name, "get_status");
  });
});

test("POST /turns tool retry does not duplicate tool_calls row", async () => {
  await withRuntimeServer(async ({ port, agentClient, convClient, modelClient, toolCallsClient, createToken }) => {
    const token = await createToken();
    const convId = "00000000-0000-4000-8000-000000000021";
    const httpTool = {
      id: "00000000-0000-4000-8000-0000000000t2",
      name: "ping_api",
      type: "http" as const,
      description: "Ping",
      method: "GET" as const,
      base_url: "https://api.example.com/",
      allowed_hosts: ["api.example.com"],
      idempotent: true,
    };

    agentClient.versions.set(`${WS_A}:${AGENT_ID}:${VERSION_ID}`, {
      id: VERSION_ID,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      release_number: 1,
      snapshot: {
        name: "v1",
        instructions: "x",
        model_settings: { profile: "fake", model_id: "fake:tool_once" },
        tools: [httpTool],
      },
    });
    agentClient.agents.set(`${WS_A}:${AGENT_ID}`, {
      id: AGENT_ID,
      workspace_id: WS_A,
      name: "Bot",
      production_version_id: VERSION_ID,
      instructions: "x",
    });
    convClient.conversations.set(`${WS_A}:${convId}`, {
      id: convId,
      workspace_id: WS_A,
      agent_id: AGENT_ID,
      last_seq: 0,
    });

    const headers = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "idempotency-key": "idemp-tool-dedup",
    };
    const url = `http://127.0.0.1:${port}/v1/workspaces/${WS_A}/conversations/${convId}/turns`;

    const first = await fetch(url, { method: "POST", headers, body: JSON.stringify({ message: "go" }) });
    assert.ok(first.status === 200 || first.status === 201);
    const callsAfterFirst = modelClient.callCount;

    const second = await fetch(url, { method: "POST", headers, body: JSON.stringify({ message: "go" }) });
    assert.equal(second.status, 200);
    const secondBody = (await second.json()) as { turn: { deduplicated: boolean } };
    assert.equal(secondBody.turn.deduplicated, true);
    assert.equal(modelClient.callCount, callsAfterFirst);

    const records = await toolCallsClient.listByTurn(WS_A, convId, "idemp-tool-dedup");
    assert.equal(records.length, 1);
  });
});
