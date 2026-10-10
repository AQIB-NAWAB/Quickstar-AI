import assert from "node:assert/strict";
import test from "node:test";
import { withConversationServer } from "../helpers/test-app.js";

const WS_A = "00000000-0000-4000-8000-0000000000a1";
const USER_A = "00000000-0000-0000-0000-00000000000a";
const USER_B = "00000000-0000-0000-0000-00000000000b";

async function createConversation(base: string, token: string): Promise<string> {
  const createRes = await fetch(`${base}/v1/workspaces/${WS_A}/conversations`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });
  assert.equal(createRes.status, 201);
  const created = (await createRes.json()) as { conversation: { id: string; state: string } };
  assert.equal(created.conversation.state, "bot");
  return created.conversation.id;
}

test("take assigns conversation to staff; second take returns 409", async () => {
  await withConversationServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const tokenA = await createToken(USER_A);
    const tokenB = await createToken(USER_B);
    const conversationId = await createConversation(base, tokenA);

    const takeA = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations/${conversationId}/take`,
      { method: "POST", headers: { authorization: `Bearer ${tokenA}` } },
    );
    assert.equal(takeA.status, 200);
    const taken = (await takeA.json()) as {
      conversation: { state: string; assignee_user_id: string };
    };
    assert.equal(taken.conversation.state, "human");
    assert.equal(taken.conversation.assignee_user_id, USER_A);

    const takeB = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations/${conversationId}/take`,
      { method: "POST", headers: { authorization: `Bearer ${tokenB}` } },
    );
    assert.equal(takeB.status, 409);
  });
});

test("human message requires handoff; assignee can post and release returns to bot", async () => {
  await withConversationServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER_A);
    const conversationId = await createConversation(base, token);

    const blocked = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          text: "Staff reply",
          sender_type: "human",
          idempotency_key: "handoff-human-1",
        }),
      },
    );
    assert.equal(blocked.status, 409);

    await fetch(`${base}/v1/workspaces/${WS_A}/conversations/${conversationId}/take`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });

    const ok = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          text: "Staff reply",
          sender_type: "human",
          idempotency_key: "handoff-human-2",
        }),
      },
    );
    assert.equal(ok.status, 201);

    const release = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations/${conversationId}/release`,
      { method: "POST", headers: { authorization: `Bearer ${token}` } },
    );
    assert.equal(release.status, 200);
    const released = (await release.json()) as { conversation: { state: string } };
    assert.equal(released.conversation.state, "bot");
  });
});

test("list conversations filters by state", async () => {
  await withConversationServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER_A);
    const id1 = await createConversation(base, token);
    const id2 = await createConversation(base, token);

    await fetch(`${base}/v1/workspaces/${WS_A}/conversations/${id1}/take`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });

    const humanList = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations?state=human`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    assert.equal(humanList.status, 200);
    const humanBody = (await humanList.json()) as { conversations: { id: string }[] };
    assert.equal(humanBody.conversations.length, 1);
    assert.equal(humanBody.conversations[0].id, id1);

    const botList = await fetch(`${base}/v1/workspaces/${WS_A}/conversations?state=bot`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const botBody = (await botList.json()) as { conversations: { id: string }[] };
    assert.ok(botBody.conversations.some((c) => c.id === id2));
    assert.ok(!botBody.conversations.some((c) => c.id === id1));
  });
});
