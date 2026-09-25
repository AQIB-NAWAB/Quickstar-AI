import assert from "node:assert/strict";
import test from "node:test";
import { withConversationServer } from "../helpers/test-app.js";

const WS_A = "00000000-0000-4000-8000-0000000000a1";
const WS_B = "00000000-0000-4000-8000-0000000000b2";
const USER = "00000000-0000-0000-0000-00000000000a";

test("strict workspace tenant isolation prevents IDOR access across workspaces", async () => {
  await withConversationServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);

    // 1. Create a conversation in Workspace A
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

    // Append a message in Workspace A
    await fetch(`${base}/v1/workspaces/${WS_A}/conversations/${conversation.id}/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ text: "Secret in WS A" }),
    });

    // 2. Try to GET the conversation using Workspace B's path -> MUST fail with 404
    const idorGet = await fetch(
      `${base}/v1/workspaces/${WS_B}/conversations/${conversation.id}`,
      {
        headers: { authorization: `Bearer ${token}` },
      },
    );
    assert.equal(idorGet.status, 404);

    // 3. Try to POST a message to Conversation A using Workspace B's path -> MUST fail with 404
    const idorPost = await fetch(
      `${base}/v1/workspaces/${WS_B}/conversations/${conversation.id}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ text: "Attack attempt" }),
      },
    );
    assert.equal(idorPost.status, 404);

    // 4. Try to list messages of Conversation A using Workspace B's path -> MUST fail with 404
    const idorListMsgs = await fetch(
      `${base}/v1/workspaces/${WS_B}/conversations/${conversation.id}/messages`,
      {
        headers: { authorization: `Bearer ${token}` },
      },
    );
    assert.equal(idorListMsgs.status, 404);

    // 5. Listing conversations in Workspace B must NOT leak Workspace A's conversation
    const wsBList = await fetch(`${base}/v1/workspaces/${WS_B}/conversations`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(wsBList.status, 200);
    const wsBData = (await wsBList.json()) as { conversations: unknown[] };
    assert.equal(wsBData.conversations.length, 0);
  });
});
