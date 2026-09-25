import assert from "node:assert/strict";
import test from "node:test";
import { withConversationServer } from "../helpers/test-app.js";

const WS_A = "00000000-0000-4000-8000-0000000000a1";
const USER = "00000000-0000-0000-0000-00000000000a";

test("idempotent message submission returns 200 deduplicated and does not advance seq", async () => {
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
      body: JSON.stringify({}),
    });
    assert.equal(createRes.status, 201);
    const { conversation } = (await createRes.json()) as { conversation: { id: string } };

    const idempotencyKey = "req-uuid-12345";
    const payload = JSON.stringify({
      text: "Transfer $100",
      idempotency_key: idempotencyKey,
      sender_type: "user",
    });

    // First attempt: should be 201 Created and deduplicated: false
    const firstRes = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations/${conversation.id}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: payload,
      },
    );
    assert.equal(firstRes.status, 201);
    const firstData = (await firstRes.json()) as {
      message: { id: string; seq: number; text: string; idempotency_key: string };
      deduplicated: boolean;
    };
    assert.equal(firstData.deduplicated, false);
    assert.equal(firstData.message.seq, 1);
    assert.equal(firstData.message.text, "Transfer $100");
    assert.equal(firstData.message.idempotency_key, idempotencyKey);

    // Second attempt (retry with same idempotency key): should return 200 OK and deduplicated: true
    const retryRes = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations/${conversation.id}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: payload,
      },
    );
    assert.equal(retryRes.status, 200);
    const retryData = (await retryRes.json()) as {
      message: { id: string; seq: number; text: string; idempotency_key: string };
      deduplicated: boolean;
    };
    assert.equal(retryData.deduplicated, true);
    assert.equal(retryData.message.id, firstData.message.id);
    assert.equal(retryData.message.seq, 1);
    assert.equal(retryData.message.text, "Transfer $100");

    // Third message with a different idempotency key: should get seq = 2, not 3
    const nextRes = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations/${conversation.id}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          text: "Confirm transfer",
          idempotency_key: "req-uuid-67890",
          sender_type: "user",
        }),
      },
    );
    assert.equal(nextRes.status, 201);
    const nextData = (await nextRes.json()) as {
      message: { id: string; seq: number };
      deduplicated: boolean;
    };
    assert.equal(nextData.deduplicated, false);
    assert.equal(nextData.message.seq, 2);

    // Verify conversation message list has exactly 2 messages
    const listRes = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations/${conversation.id}/messages`,
      {
        headers: { authorization: `Bearer ${token}` },
      },
    );
    assert.equal(listRes.status, 200);
    const listData = (await listRes.json()) as { messages: { id: string; seq: number }[] };
    assert.equal(listData.messages.length, 2);
    assert.equal(listData.messages[0].seq, 1);
    assert.equal(listData.messages[1].seq, 2);
  });
});
