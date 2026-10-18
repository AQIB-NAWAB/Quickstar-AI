import assert from "node:assert/strict";
import test from "node:test";
import type { WorkflowGraph } from "@quickstart/contracts";
import {
  validateWorkflowGraph,
  evaluateWorkflowConditionGroup,
  getWorkflowValue,
} from "@quickstart/contracts";
import { simulateWorkflowGraph } from "./simulator.js";
import { renderTemplate } from "./template.js";
import { WorkflowsService } from "../services/workflows.service.js";
import type { WorkflowsRepository } from "../repository/workflows.repository.js";
const graph = (): WorkflowGraph => ({
  schema_version: 1,
  entry_node_id: "trigger",
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [
    {
      id: "trigger",
      type: "trigger",
      name: "Trigger",
      position: { x: 0, y: 0 },
      config: { event_type: "message.appended" },
    },
    {
      id: "condition",
      type: "condition",
      name: "Match",
      position: { x: 1, y: 1 },
      config: {
        root_group: {
          id: "g",
          logic: "and",
          children: [{ id: "r", field: "message.text", operator: "contains", value: "refund" }],
        },
      },
    },
    {
      id: "http",
      type: "webhook",
      name: "HTTP",
      position: { x: 2, y: 2 },
      config: {
        method: "POST",
        url: "https://example.com/",
        body: '{"message":"{{event.message.text}}"}',
      },
    },
    { id: "end", type: "end", name: "End", position: { x: 3, y: 3 }, config: {} },
  ],
  edges: [
    { id: "1", source: "trigger", sourcePort: "received", target: "condition", targetPort: "in" },
    { id: "2", source: "condition", sourcePort: "matched", target: "http", targetPort: "in" },
    { id: "3", source: "http", sourcePort: "success", target: "end", targetPort: "in" },
  ],
});
test("canonical children and nested legacy groups use the same evaluator", () => {
  assert.equal(
    evaluateWorkflowConditionGroup(
      {
        id: "a",
        logic: "and",
        children: [
          {
            id: "b",
            logic: "or",
            children: [{ id: "c", field: "x", operator: "equals", value: "yes" }],
          },
        ],
      },
      { x: "yes" },
    ).matched,
    true,
  );
  assert.equal(
    evaluateWorkflowConditionGroup(
      {
        id: "a",
        logic: "or",
        rules: [],
        groups: [
          {
            id: "b",
            logic: "and",
            rules: [{ id: "c", field: "x", operator: "equals", value: "yes" }],
          },
        ],
      },
      { x: "no" },
    ).matched,
    false,
  );
});
test("missing values and empty strings do not become zero in numeric comparisons", () => {
  for (const x of [undefined, null, "", false])
    assert.equal(
      evaluateWorkflowConditionGroup(
        {
          id: "a",
          logic: "and",
          children: [{ id: "r", field: "x", operator: "less_than", value: "1" }],
        },
        { x },
      ).matched,
      false,
    );
});
test("inherited and prototype paths are inaccessible", () => {
  assert.equal(getWorkflowValue({}, "constructor.name"), undefined);
  assert.equal(getWorkflowValue(Object.create({ secret: "leak" }), "secret"), undefined);
});
test("untrusted regex patterns are not executed", () => {
  assert.equal(
    evaluateWorkflowConditionGroup(
      {
        id: "g",
        logic: "and",
        children: [{ id: "r", field: "text", operator: "matches_regex", value: ".*" }],
      },
      { text: "hello" },
    ).matched,
    false,
  );
});
test("JSON template substitutions escape quotes and retain typed whole values", () => {
  assert.deepEqual(
    JSON.parse(
      renderTemplate(
        '{"message":"{{event.message}}","flag":{{event.flag}},"count":{{event.count}}}',
        { message: 'a"b\nc', flag: false, count: 0 },
        true,
      ),
    ),
    { message: 'a"b\nc', flag: false, count: 0 },
  );
});
test("simulation cannot fall back from an unmatched condition into the matched action", () => {
  const result = simulateWorkflowGraph(graph(), { message: { text: "hello" } });
  assert.equal(result.status, "failed");
  assert.equal(
    result.traces.some((t) => t.node_type === "webhook"),
    false,
  );
});
test("external effects are simulated without fake HTTP status or delivery claims", () => {
  const result = simulateWorkflowGraph(graph(), { message: { text: "refund" } });
  const http = result.traces.find((t) => t.node_type === "webhook")!;
  assert.equal(result.status, "succeeded");
  assert.equal(http.output?.simulated, true);
  assert.equal(http.output?.status, undefined);
  assert.ok(!http.logs?.join().includes("200"));
});
test("cycles cannot appear to finish successfully", () => {
  const g = graph();
  g.edges[2].target = "http";
  assert.equal(simulateWorkflowGraph(g, { message: { text: "refund" } }).status, "failed");
});
test("malformed graphs produce validation errors", () => {
  for (const value of [
    null,
    { nodes: [null] },
    {
      ...graph(),
      nodes: [{ ...graph().nodes[1], config: { root_group: { logic: "and", rules: 42 } } }],
    },
  ])
    assert.equal(validateWorkflowGraph(value as WorkflowGraph).valid, false);
});
test("unknown ports and duplicate triggers block activation", () => {
  const g = graph();
  g.edges[0].sourcePort = "error";
  g.nodes.push({ ...g.nodes[0], id: "extra" });
  const issues = validateWorkflowGraph(g).blockers.map((i) => i.code);
  assert.ok(issues.includes("INVALID_PORT"));
  assert.ok(issues.includes("TRIGGER_COUNT"));
});
test("CRUD cannot bypass activation permission", async () => {
  const service = new WorkflowsService({} as WorkflowsRepository, 10);
  await assert.rejects(
    service.create("ws", {
      name: "Test",
      trigger_event_type: "message.appended",
      status: "active",
    }),
    /draft first/,
  );
  await assert.rejects(
    service.update("ws", "wf", { expected_version: 1, status: "active" }),
    /dedicated/,
  );
});
test("simulation still authorizes workflow ownership when caller supplies a graph", async () => {
  const service = new WorkflowsService(
    {
      async get() {
        return null;
      },
    } as unknown as WorkflowsRepository,
    10,
  );
  await assert.rejects(service.simulate("other-workspace", "wf", { graph: graph() }), /not found/);
});

test("workflow authentication ignores unsigned actor context", async () => {
  const { createAuthMiddleware } = await import("../middleware/auth.middleware.js");
  const { signAccessToken } = await import("@quickstart/auth");
  const secret = "workflow-review-secret-at-least-thirty-two-characters";
  const guard = createAuthMiddleware(secret);
  const spoof = Buffer.from(
    JSON.stringify({ actor_id: "spoofed", tenant_id: "org", roles: [] }),
  ).toString("base64url");
  const response = { locals: {}, getHeader: () => "request" };
  let error: unknown;
  await guard(
    { headers: { "x-quickstart-auth-context": spoof } } as never,
    response as never,
    (e?: unknown) => {
      error = e;
    },
  );
  assert.ok(error);
  const token = await signAccessToken(
    { sub: "verified", org_id: "org", sid: "session" },
    { secret, ttlSeconds: 60 },
  );
  error = undefined;
  await guard(
    { headers: { authorization: `Bearer ${token}`, "x-quickstart-auth-context": spoof } } as never,
    response as never,
    (e?: unknown) => {
      error = e;
    },
  );
  assert.equal(error, undefined);
  assert.equal((response.locals as Record<string, unknown>).actorUserId, "verified");
});

test("a legacy version number cannot overwrite a newer draft revision", async () => {
  const { WorkflowsRepository } = await import("../repository/workflows.repository.js");
  const repo = new WorkflowsRepository({
    query() {
      throw new Error("must not write");
    },
  } as never);
  repo.get = async () => ({ draftRevision: 5, version: 1 }) as never;
  await assert.rejects(
    repo.saveDraft({
      workspaceId: "ws",
      workflowId: "wf",
      expectedRevision: 1,
      draftGraph: graph(),
    }),
    /modified/,
  );
});
test("activation rechecks the revision under a database lock", async () => {
  const { WorkflowsRepository } = await import("../repository/workflows.repository.js");
  const queries: string[] = [];
  const client = {
    async query(sql: string) {
      queries.push(sql);
      return { rows: sql.includes("FOR UPDATE") ? [{ draft_revision: 3 }] : [] };
    },
    release() {},
  };
  const repo = new WorkflowsRepository({
    async connect() {
      return client;
    },
  } as never);
  repo.get = async () => ({ draftRevision: 2, version: 1, draftGraph: graph() }) as never;
  await assert.rejects(
    repo.activate({ workspaceId: "ws", workflowId: "wf", expectedRevision: 2 }),
    /changed/,
  );
  assert.ok(queries.some((q) => q.includes("FOR UPDATE")));
  assert.ok(queries.includes("ROLLBACK"));
  assert.ok(!queries.some((q) => q.includes("INSERT INTO workflow_versions")));
});
test("canceled runs cannot be changed back to running by late progress", async () => {
  const { WorkflowsRepository } = await import("../repository/workflows.repository.js");
  let sql = "";
  const repo = new WorkflowsRepository({} as never);
  await repo.updateRunProgress(
    {
      async query(q: string) {
        sql = q;
      },
    } as never,
    { runId: "r", status: "running", currentStepIndex: 1, stepsCompleted: 1 },
  );
  assert.ok(sql.includes("status <> 'canceled'"));
});
test("a duplicate or uncertain HTTP action is fenced before network dispatch", async () => {
  const { executeAction } = await import("./actions.js");
  await assert.rejects(
    executeAction(
      {
        id: "http",
        kind: "webhook",
        displayName: "HTTP",
        config: { method: "POST", url: "https://8.8.8.8/" },
      },
      {
        workspaceId: "ws",
        runId: "run",
        eventId: "event",
        eventData: {},
        allowHttpWebhooks: false,
        webhookTimeoutMs: 100,
        client: {} as never,
        repo: {
          async insertSideEffect() {
            return { inserted: false };
          },
        } as never,
      },
    ),
    /already dispatched|uncertain/,
  );
});
test("unconnected domain actions fail rather than claiming successful delivery", async () => {
  const { executeAction } = await import("./actions.js");
  for (const kind of ["agent_handoff", "notification", "update_tags"] as const) {
    await assert.rejects(
      executeAction(
        { id: "node", kind, displayName: kind, config: {} },
        {
          workspaceId: "ws",
          runId: "r",
          eventId: "e",
          eventData: {},
          allowHttpWebhooks: false,
          webhookTimeoutMs: 100,
          client: {} as never,
          repo: {} as never,
        },
      ),
      /No action was performed/,
    );
  }
});
test("IPv4-mapped IPv6 and unspecified addresses cannot bypass SSRF restrictions", async () => {
  const { isBlockedIp } = await import("./ssrf.js");
  for (const ip of ["::", "::ffff:127.0.0.1", "::ffff:7f00:1", "ff02::1", "198.18.0.1"])
    assert.equal(isBlockedIp(ip), true);
});
