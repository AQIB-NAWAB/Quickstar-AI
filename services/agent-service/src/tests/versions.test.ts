import assert from "node:assert/strict";
import test from "node:test";
import { withAgentServer } from "../helpers/test-app.js";
import { MemoryAgentStore } from "../repository/memory.js";

const WS_A = "00000000-0000-4000-8000-0000000000a1";
const WS_B = "00000000-0000-4000-8000-0000000000b2";
const USER = "00000000-0000-0000-0000-00000000000a";

async function createAgent(base: string, token: string, instructions = "v1 instructions") {
  const createRes = await fetch(`${base}/v1/workspaces/${WS_A}/agents`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: "Versioned Bot",
      instructions,
    }),
  });
  assert.equal(createRes.status, 201);
  return (await createRes.json()) as { agent: { id: string; version: number } };
}

test("publish creates release 1 and sets production pointer", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);
    const { agent } = await createAgent(base, token);

    const publishRes = await fetch(
      `${base}/v1/workspaces/${WS_A}/agents/${agent.id}/publish`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ base_version: agent.version }),
      },
    );
    assert.equal(publishRes.status, 201);
    const body = (await publishRes.json()) as {
      version: { id: string; release_number: number; snapshot: { instructions: string } };
      agent: { production_version_id: string; version: number };
    };
    assert.equal(body.version.release_number, 1);
    assert.equal(body.version.snapshot.instructions, "v1 instructions");
    assert.equal(body.agent.production_version_id, body.version.id);
    assert.equal(body.agent.version, 1);
  });
});

test("stale base_version on publish returns 409", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);
    const { agent } = await createAgent(base, token);

    const patchRes = await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ expected_version: 1, instructions: "bumped" }),
    });
    assert.equal(patchRes.status, 200);

    const publishRes = await fetch(
      `${base}/v1/workspaces/${WS_A}/agents/${agent.id}/publish`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ base_version: 1 }),
      },
    );
    assert.equal(publishRes.status, 409);
  });
});

test("publish freezes tools on snapshot", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);
    const { agent } = await createAgent(base, token);

    const tool = {
      id: "00000000-0000-4000-8000-0000000000t1",
      name: "get_status",
      type: "http" as const,
      description: "Fetch order status",
      method: "GET" as const,
      base_url: "https://api.example.com/v1/status",
      allowed_hosts: ["api.example.com"],
      idempotent: true,
    };

    const patchRes = await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ expected_version: agent.version, tools: [tool] }),
    });
    assert.equal(patchRes.status, 200);
    const patched = (await patchRes.json()) as { agent: { version: number; tools: unknown[] } };
    assert.equal(patched.agent.tools.length, 1);

    const publishRes = await fetch(
      `${base}/v1/workspaces/${WS_A}/agents/${agent.id}/publish`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ base_version: patched.agent.version }),
      },
    );
    assert.equal(publishRes.status, 201);
    const published = (await publishRes.json()) as {
      version: { id: string; snapshot: { tools: { name: string }[] } };
    };
    assert.equal(published.version.snapshot.tools[0].name, "get_status");

    const patch2 = await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ expected_version: patched.agent.version, tools: [] }),
    });
    assert.equal(patch2.status, 200);

    const versionId = published.version.id;
    const getVer = await fetch(
      `${base}/v1/workspaces/${WS_A}/agents/${agent.id}/versions/${versionId}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    const verBody = (await getVer.json()) as { version: { snapshot: { tools: unknown[] } } };
    assert.equal(verBody.version.snapshot.tools.length, 1);
  });
});

test("draft edits do not change published snapshot", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);
    const { agent } = await createAgent(base, token);

    const publishRes = await fetch(
      `${base}/v1/workspaces/${WS_A}/agents/${agent.id}/publish`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ base_version: agent.version }),
      },
    );
    const published = (await publishRes.json()) as {
      version: { id: string };
    };

    const patchRes = await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ expected_version: 1, instructions: "draft only change" }),
    });
    assert.equal(patchRes.status, 200);

    const versionRes = await fetch(
      `${base}/v1/workspaces/${WS_A}/agents/${agent.id}/versions/${published.version.id}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    assert.equal(versionRes.status, 200);
    const versionBody = (await versionRes.json()) as {
      version: { snapshot: { instructions: string } };
    };
    assert.equal(versionBody.version.snapshot.instructions, "v1 instructions");

    const agentRes = await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const agentBody = (await agentRes.json()) as { agent: { instructions: string } };
    assert.equal(agentBody.agent.instructions, "draft only change");
  });
});

test("second publish increments release_number", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);
    const { agent } = await createAgent(base, token);

    await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}/publish`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ base_version: 1 }),
    });

    await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ expected_version: 1, instructions: "v2" }),
    });

    const second = await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}/publish`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ base_version: 2 }),
    });
    assert.equal(second.status, 201);
    const body = (await second.json()) as { version: { release_number: number } };
    assert.equal(body.version.release_number, 2);
  });
});

test("rollback moves production pointer without deleting releases", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);
    const { agent } = await createAgent(base, token);

    const first = await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}/publish`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ base_version: 1 }),
    });
    const firstBody = (await first.json()) as { version: { id: string } };
    const v1Id = firstBody.version.id;

    await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ expected_version: 1, instructions: "v2 draft" }),
    });
    const second = await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}/publish`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ base_version: 2 }),
    });
    const secondBody = (await second.json()) as { version: { id: string } };

    const rollbackRes = await fetch(
      `${base}/v1/workspaces/${WS_A}/agents/${agent.id}/rollback`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ version_id: v1Id }),
      },
    );
    assert.equal(rollbackRes.status, 200);
    const rollbackBody = (await rollbackRes.json()) as {
      agent: { production_version_id: string };
    };
    assert.equal(rollbackBody.agent.production_version_id, v1Id);

    const stillThere = await fetch(
      `${base}/v1/workspaces/${WS_A}/agents/${agent.id}/versions/${secondBody.version.id}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    assert.equal(stillThere.status, 200);
  });
});

test("cross-workspace version access returns 404", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);
    const { agent } = await createAgent(base, token);

    const publishRes = await fetch(
      `${base}/v1/workspaces/${WS_A}/agents/${agent.id}/publish`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ base_version: 1 }),
      },
    );
    const { version } = (await publishRes.json()) as { version: { id: string } };

    const idor = await fetch(
      `${base}/v1/workspaces/${WS_B}/agents/${agent.id}/versions/${version.id}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    assert.equal(idor.status, 404);
  });
});

test("analyst cannot publish agents (403)", async () => {
  const store = new MemoryAgentStore();
  const agent = await store.createAgent(
    { workspaceId: WS_A, actorId: USER },
    { name: "Analyst Publish Test", instructions: "x" },
  );

  await withAgentServer(
    async ({ port, createToken }) => {
      const base = `http://127.0.0.1:${port}`;
      const token = await createToken(USER);

      const res = await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}/publish`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ base_version: 1 }),
      });
      assert.equal(res.status, 403);
    },
    { role: "analyst", store },
  );
});

test("diff reports changed instructions between releases", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);
    const { agent } = await createAgent(base, token, "first");

    const v1 = await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}/publish`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ base_version: 1 }),
    });
    const v1Body = (await v1.json()) as { version: { id: string } };

    await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ expected_version: 1, instructions: "second" }),
    });
    const v2 = await fetch(`${base}/v1/workspaces/${WS_A}/agents/${agent.id}/publish`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ base_version: 2 }),
    });
    const v2Body = (await v2.json()) as { version: { id: string } };

    const diffRes = await fetch(
      `${base}/v1/workspaces/${WS_A}/agents/${agent.id}/versions/${v1Body.version.id}/diff/${v2Body.version.id}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    assert.equal(diffRes.status, 200);
    const diff = (await diffRes.json()) as {
      fields: { instructions?: { before: string; after: string } };
    };
    assert.equal(diff.fields.instructions?.before, "first");
    assert.equal(diff.fields.instructions?.after, "second");
  });
});
