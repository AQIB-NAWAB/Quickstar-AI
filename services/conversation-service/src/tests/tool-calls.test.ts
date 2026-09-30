import assert from "node:assert/strict";
import test from "node:test";
import { withConversationServer } from "../helpers/test-app.js";

const WS_A = "00000000-0000-4000-8000-0000000000a1";
const WS_B = "00000000-0000-4000-8000-0000000000b2";
const USER = "00000000-0000-0000-0000-00000000000a";

test("tool call upsert is idempotent per tool_call_key", async () => {
  await withConversationServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);

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

    const body = {
      turn_idempotency_key: "turn-001",
      tool_call_key: "turn-001:tool:0:get_status",
      tool_name: "get_status",
      status: "pending" as const,
      request_json: { url: "https://api.example.com" },
    };

    const put1 = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations/${conversation.id}/tool-calls`,
      {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    assert.equal(put1.status, 201);

    const put2 = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations/${conversation.id}/tool-calls`,
      {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...body,
          status: "succeeded",
          response_json: { ok: true },
        }),
      },
    );
    assert.equal(put2.status, 200);

    const put3 = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations/${conversation.id}/tool-calls`,
      {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...body,
          status: "failed",
        }),
      },
    );
    assert.equal(put3.status, 200);
    const replay = (await put3.json()) as { tool_call: { status: string } };
    assert.equal(replay.tool_call.status, "succeeded");

    const listRes = await fetch(
      `${base}/v1/workspaces/${WS_A}/conversations/${conversation.id}/tool-calls?turn_idempotency_key=turn-001`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    assert.equal(listRes.status, 200);
    const listBody = (await listRes.json()) as { tool_calls: unknown[] };
    assert.equal(listBody.tool_calls.length, 1);
  });
});

test("tool calls are isolated by workspace", async () => {
  await withConversationServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);

    const createRes = await fetch(`${base}/v1/workspaces/${WS_A}/conversations`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const { conversation } = (await createRes.json()) as { conversation: { id: string } };

    await fetch(`${base}/v1/workspaces/${WS_A}/conversations/${conversation.id}/tool-calls`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        turn_idempotency_key: "t1",
        tool_call_key: "k1",
        tool_name: "x",
        status: "succeeded",
        response_json: { secret: "a" },
      }),
    });

    const cross = await fetch(
      `${base}/v1/workspaces/${WS_B}/conversations/${conversation.id}/tool-calls?turn_idempotency_key=t1`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    assert.equal(cross.status, 404);
  });
});
