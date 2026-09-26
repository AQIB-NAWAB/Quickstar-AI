import assert from "node:assert/strict";
import test from "node:test";
import { withConversationServer } from "../helpers/test-app.js";

const WS_A = "00000000-0000-4000-8000-0000000000a1";
const USER = "00000000-0000-0000-0000-00000000000a";

test("create, retrieve, and list conversations in workspace", async () => {
  await withConversationServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);

    // Create conversation
    const createRes = await fetch(`${base}/v1/workspaces/${WS_A}/conversations`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        agent_id: "00000000-0000-0000-0000-000000000002",
      }),
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()) as {
      conversation: { id: string; workspace_id: string; agent_id: string; last_seq: number };
    };
    assert.ok(created.conversation.id);
    assert.equal(created.conversation.workspace_id, WS_A);
    assert.equal(created.conversation.agent_id, "00000000-0000-0000-0000-000000000002");
    assert.equal(created.conversation.last_seq, 0);

    // Get conversation by ID
    const getRes = await fetch(`${base}/v1/workspaces/${WS_A}/conversations/${created.conversation.id}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(getRes.status, 200);
    const fetched = (await getRes.json()) as { conversation: { id: string } };
    assert.equal(fetched.conversation.id, created.conversation.id);

    // List conversations
    const listRes = await fetch(`${base}/v1/workspaces/${WS_A}/conversations`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(listRes.status, 200);
    const list = (await listRes.json()) as { conversations: { id: string }[] };
    assert.equal(list.conversations.length, 1);
    assert.equal(list.conversations[0].id, created.conversation.id);
  });
});

test("append messages with sequential numbering and retrieve message history", async () => {
  await withConversationServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);

    // 1. Create conversation
    const createRes = await fetch(`${base}/v1/workspaces/${WS_A}/conversations`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    assert.equal(createRes.status, 201);
    const { conversation } = (await createRes.json()) as { conversation: { id: string } };

    // 2. Append message 1
    const msg1Res = await fetch(`${base}/v1/workspaces/${WS_A}/conversations/${conversation.id}/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text: "Hello world",
        sender_type: "user",
        idempotency_key: "conv-test-msg-1",
      }),
    });
    assert.equal(msg1Res.status, 201);
    const msg1Data = (await msg1Res.json()) as {
      message: { id: string; seq: number; text: string; sender_type: string; sender_id: string };
      deduplicated: boolean;
    };
    assert.equal(msg1Data.message.seq, 1);
    assert.equal(msg1Data.message.text, "Hello world");
    assert.equal(msg1Data.message.sender_type, "user");
    assert.equal(msg1Data.message.sender_id, USER);
    assert.equal(msg1Data.deduplicated, false);

    // 3. Append message 2
    const msg2Res = await fetch(`${base}/v1/workspaces/${WS_A}/conversations/${conversation.id}/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text: "Second message",
        sender_type: "user",
        idempotency_key: "conv-test-msg-2",
      }),
    });
    assert.equal(msg2Res.status, 201);
    const msg2Data = (await msg2Res.json()) as {
      message: { id: string; seq: number; text: string };
      deduplicated: boolean;
    };
    assert.equal(msg2Data.message.seq, 2);
    assert.equal(msg2Data.message.text, "Second message");

    // 4. List all messages
    const listRes = await fetch(`${base}/v1/workspaces/${WS_A}/conversations/${conversation.id}/messages`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(listRes.status, 200);
    const listData = (await listRes.json()) as { messages: { id: string; seq: number }[] };
    assert.equal(listData.messages.length, 2);
    assert.equal(listData.messages[0].seq, 1);
    assert.equal(listData.messages[1].seq, 2);

    // 5. List messages after_seq=1
    const pagedRes = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations/${conversation.id}/messages?after_seq=1`,
      {
        headers: { authorization: `Bearer ${token}` },
      },
    );
    assert.equal(pagedRes.status, 200);
    const pagedData = (await pagedRes.json()) as { messages: { id: string; seq: number }[] };
    assert.equal(pagedData.messages.length, 1);
    assert.equal(pagedData.messages[0].seq, 2);
  });
});

test("role without conversation permissions receives 403 Forbidden", async () => {
  await withConversationServer(
    async ({ port, createToken }) => {
      const base = `http://127.0.0.1:${port}`;
      const token = await createToken(USER);

      const res = await fetch(`${base}/v1/workspaces/${WS_A}/conversations`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 403);
    },
    { role: "analyst" }, // analyst role does not have CONVERSATION_PARTICIPATE
  );
});
