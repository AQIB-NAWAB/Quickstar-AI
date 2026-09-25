import assert from "node:assert/strict";
import test from "node:test";
import { withAgentServer } from "../helpers/test-app.js";

const WS_A = "00000000-0000-4000-8000-0000000000a1";
const WS_B = "00000000-0000-4000-8000-0000000000b2";
const USER = "00000000-0000-0000-0000-00000000000a";

test("create and list agents in workspace", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);

    const createRes = await fetch(`${base}/v1/workspaces/${WS_A}/agents`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Support Bot",
        instructions: "Be helpful",
      }),
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()) as { agent: { id: string; version: number; name: string } };
    assert.equal(created.agent.name, "Support Bot");
    assert.equal(created.agent.version, 1);

    const listRes = await fetch(`${base}/v1/workspaces/${WS_A}/agents`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(listRes.status, 200);
    const list = (await listRes.json()) as { agents: { id: string }[] };
    assert.equal(list.agents.length, 1);
    assert.equal(list.agents[0].id, created.agent.id);
  });
});

test("duplicate agent name returns 409", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);
    const body = JSON.stringify({ name: "Dup", instructions: "x" });

    const first = await fetch(`${base}/v1/workspaces/${WS_A}/agents`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body,
    });
    assert.equal(first.status, 201);

    const second = await fetch(`${base}/v1/workspaces/${WS_A}/agents`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body,
    });
    assert.equal(second.status, 409);
  });
});

test("stale expected_version returns 409 on update", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);

    const createRes = await fetch(`${base}/v1/workspaces/${WS_A}/agents`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ name: "V", instructions: "a" }),
    });
    const { agent } = (await createRes.json()) as { agent: { id: string; version: number } };

    const ok = await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ expected_version: 1, instructions: "b" }),
    });
    assert.equal(ok.status, 200);

    const stale = await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ expected_version: 1, instructions: "c" }),
    });
    assert.equal(stale.status, 409);
  });
});

test("cross-workspace agent read returns 404", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);

    const createRes = await fetch(`${base}/v1/workspaces/${WS_A}/agents`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ name: "Secret", instructions: "x" }),
    });
    const { agent } = (await createRes.json()) as { agent: { id: string } };

    const cross = await fetch(`${base}/v1/workspaces/${WS_B}/agents/${agent.id}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(cross.status, 404);
  });
});

test("analyst cannot create agent (403)", async () => {
  await withAgentServer(
    async ({ port, createToken }) => {
      const base = `http://127.0.0.1:${port}`;
      const token = await createToken(USER);

      const res = await fetch(`${base}/v1/workspaces/${WS_A}/agents`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ name: "Nope", instructions: "x" }),
      });
      assert.equal(res.status, 403);
    },
    { role: "analyst" },
  );
});
