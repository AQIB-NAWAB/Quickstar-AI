import test from "node:test";
import assert from "node:assert/strict";
import type { AgentGraph, AgentGraphNode } from "@quickstart/contracts";
import { normalizeAgentGraph, validateAgentGraph } from "@quickstart/contracts";
import { GraphEngine } from "./engine.js";
import { GraphNodeRegistry } from "./registry.js";
import { GraphSessionStore } from "./session-store.js";
import { setVariablePath, resolveVariablePath } from "./eval-utils.js";
import type { KnowledgeClient } from "../clients/knowledge.client.js";
import type { ModelGatewayClient } from "../clients/model-gateway.client.js";

const node = (
  id: string,
  type: AgentGraphNode["type"],
  config: Record<string, unknown> = {},
): AgentGraphNode => ({
  id,
  type,
  name: id,
  position: { x: 0, y: 0 },
  config: config as AgentGraphNode["config"],
});
const graph = (nodes: AgentGraphNode[], connections: [string, string, string][]): AgentGraph => ({
  schema_version: 1,
  entry_node_id: nodes[0].id,
  nodes,
  edges: connections.map(([source, source_port, target], i) => ({
    id: `e${i}`,
    source,
    source_port,
    target,
    target_port: "in",
  })),
});
const fixture = () => {
  const store = new GraphSessionStore();
  return { store, engine: new GraphEngine(new GraphNodeRegistry(), store) };
};
const run = (engine: GraphEngine, g: AgentGraph, message?: string, workspace = "a") =>
  engine.executeTurn({
    workspaceId: workspace,
    agentId: "agent",
    conversationId: "conversation",
    sessionId: "session",
    graph: g,
    releaseId: null,
    channel: "chat",
    isPreview: true,
    requestId: crypto.randomUUID(),
    visitorMessage: message,
  });

test("legacy editor edges normalize into executable ports", () => {
  const g = graph(
    [node("entry", "entrypoint", { allowed_channels: ["chat"] }), node("end", "end_conversation")],
    [],
  );
  g.edges = [
    {
      id: "edge",
      source_node_id: "entry",
      source_port_id: "out",
      target_node_id: "end",
      target_port_id: "in",
    },
  ];
  assert.deepEqual(normalizeAgentGraph(g).edges[0], {
    id: "edge",
    source: "entry",
    source_port: "interaction_received",
    target: "end",
    target_port: "in",
  });
  assert.equal(validateAgentGraph(g).valid, true);
});
test("invalid port and duplicate target branch are rejected", () => {
  const g = graph(
    [node("entry", "entrypoint"), node("end", "end_conversation")],
    [
      ["entry", "bad", "end"],
      ["entry", "bad", "end"],
    ],
  );
  const issues = validateAgentGraph(g).issues.map((i) => i.code);
  assert.ok(issues.includes("PORT_INVALID"));
  assert.ok(issues.includes("PORT_MULTIPLE_TARGETS"));
});
test("malformed graphs return validation errors instead of throwing", () => {
  assert.equal(
    validateAgentGraph({ nodes: [null], edges: [] } as unknown as AgentGraph).valid,
    false,
  );
  const g = graph(
    [
      node("entry", "entrypoint"),
      node("capture", "conversation", { captured_fields: [{ variable: 42 }] }),
    ],
    [],
  );
  assert.equal(validateAgentGraph(g).valid, false);
});
test("edited aliases override previously normalized settings", () => {
  const g = graph(
    [node("welcome", "welcome", { fixed_text: "First", transition: "continue" })],
    [],
  );
  const saved = normalizeAgentGraph(g);
  saved.nodes[0].config = {
    ...saved.nodes[0].config,
    fixed_text: "Edited",
    transition: "wait_for_input",
  };
  const edited = normalizeAgentGraph(saved).nodes[0].config as Record<string, unknown>;
  assert.equal(edited.message, "Edited");
  assert.equal(edited.after_mode, "wait");
});
test("capture stays on its node until all fields arrive and does not invent a name", async () => {
  const { engine } = fixture();
  const g = graph(
    [
      node("entry", "entrypoint"),
      node("capture", "conversation", {
        instructions: "Ask for details",
        capture_fields: [
          { field_name: "name", type: "text", required: true },
          { field_name: "date", type: "date", required: true },
        ],
      }),
      node("end", "end_conversation"),
    ],
    [
      ["entry", "interaction_received", "capture"],
      ["capture", "details_complete", "end"],
    ],
  );
  const a = await run(engine, g, "tomorrow");
  assert.equal(a.currentNodeId, "capture");
  assert.equal(resolveVariablePath("name", a.sessionState.variables), undefined);
  assert.equal(a.status, "waiting_for_input");
  const b = await run(engine, g, "Jane Smith");
  assert.equal(b.status, "completed");
  assert.equal(resolveVariablePath("name", b.sessionState.variables), "Jane Smith");
});
test("welcome waits once, then consumes next visitor turn in the next node", async () => {
  const { engine } = fixture();
  const g = graph(
    [
      node("entry", "entrypoint"),
      node("welcome", "welcome", { fixed_text: "Hello", transition: "wait_for_input" }),
      node("reply", "response", {
        content_type: "variable_reference",
        variable_name: "visitor.message",
      }),
      node("end", "end_conversation"),
    ],
    [
      ["entry", "interaction_received", "welcome"],
      ["welcome", "message_sent", "reply"],
      ["reply", "message_sent", "end"],
    ],
  );
  const a = await run(engine, g);
  assert.deepEqual(a.messages, ["Hello"]);
  assert.equal(a.currentNodeId, "reply");
  const b = await run(engine, g, "My question");
  assert.deepEqual(b.messages, ["My question"]);
  await assert.rejects(run(engine, g, "retry"), /ended/);
});
test("session graph remains frozen when draft is edited", async () => {
  const { engine } = fixture();
  const g = graph(
    [
      node("entry", "entrypoint"),
      node("welcome", "welcome", { fixed_text: "Hello", transition: "wait_for_input" }),
      node("end", "end_conversation", { closing_message: "Original" }),
    ],
    [
      ["entry", "interaction_received", "welcome"],
      ["welcome", "message_sent", "end"],
    ],
  );
  await run(engine, g);
  const edited = structuredClone(g);
  edited.nodes[2].config = { closing_message: "Changed" };
  const b = await run(engine, edited, "Goodbye");
  assert.deepEqual(b.messages, ["Original"]);
});
test("session and traces cannot cross workspace boundaries", async () => {
  const { engine, store } = fixture();
  const g = graph(
    [node("entry", "entrypoint"), node("end", "end_conversation")],
    [["entry", "interaction_received", "end"]],
  );
  const a = await run(engine, g);
  assert.equal(await store.getSession("b", "session"), null);
  assert.equal(await store.getTrace("b", a.runId), null);
  assert.deepEqual(await store.listTraces("b", "session"), []);
});
test("trace listeners are workspace scoped", async () => {
  const { store } = fixture();
  let called = false;
  store.subscribeTrace("b", "session", () => {
    called = true;
  });
  const event = { event_id: "e" } as never;
  await store.appendTraceEvent("a", "session", event);
  assert.equal(called, false);
});
test("concurrent turns use exclusive session lock", async () => {
  const { store } = fixture();
  let release!: () => void;
  const waiting = new Promise<void>((r) => {
    release = r;
  });
  const first = store.withSessionLock("a", "session", () => waiting);
  await assert.rejects(
    store.withSessionLock("a", "session", async () => {}),
    /already processing/,
  );
  release();
  await first;
});
test("internal channel model calls inherit frozen agent settings without browser credentials", async () => {
  let called = false;
  const modelGateway = {
    async complete(body: { model: { model_id: string }; temperature: number }) {
      called = true;
      assert.equal(body.model.model_id, "configured-model");
      assert.equal(body.temperature, 0.7);
      return { content: "Verified answer" };
    },
  } as unknown as ModelGatewayClient;
  const engine = new GraphEngine(new GraphNodeRegistry({ modelGateway }), new GraphSessionStore());
  const g = graph(
    [
      node("entry", "entrypoint"),
      node("ai", "ai_prompt", { instructions: "Answer", output_variable: "answer.text" }),
      node("response", "response", {
        content_type: "variable_reference",
        variable_name: "answer.text",
      }),
      node("end", "end_conversation"),
    ],
    [
      ["entry", "interaction_received", "ai"],
      ["ai", "success", "response"],
      ["response", "message_sent", "end"],
    ],
  );
  const result = await engine.executeTurn({
    workspaceId: "a",
    agentId: "agent",
    conversationId: "c",
    graph: g,
    releaseId: "r",
    channel: "voice",
    isPreview: false,
    requestId: "request",
    visitorMessage: "Question",
    agentDefaults: {
      instructions: "Persona",
      model_settings: { model_id: "configured-model", temperature: 0.7 },
      tools: [],
    },
  });
  assert.equal(called, true);
  assert.deepEqual(result.messages, ["Verified answer"]);
  assert.equal(result.status, "completed");
});
test("internal channel knowledge retrieval uses service credentials and selected sources", async () => {
  let requestedWorkspace = "";
  const knowledgeClient = {
    async retrieve(workspaceId: string) {
      requestedWorkspace = workspaceId;
      return [
        { chunk_id: "one", source_id: "selected", text: "Clinic hours", score: 1 },
        { chunk_id: "two", source_id: "other", text: "Other", score: 1 },
      ];
    },
  } as unknown as KnowledgeClient;
  const store = new GraphSessionStore();
  const engine = new GraphEngine(new GraphNodeRegistry({ knowledgeClient }), store);
  const g = graph(
    [
      node("entry", "entrypoint"),
      node("knowledge", "knowledge_search", {
        source_ids: ["selected"],
        output_variable: "knowledge.results",
      }),
      node("end", "end_conversation"),
    ],
    [
      ["entry", "interaction_received", "knowledge"],
      ["knowledge", "results_found", "end"],
    ],
  );
  const result = await run(engine, g, "Hours?");
  assert.equal(requestedWorkspace, "a");
  assert.equal(result.status, "completed");
  assert.deepEqual(resolveVariablePath("knowledge.results", result.sessionState.variables), [
    { chunk_id: "one", source_id: "selected", text: "Clinic hours", score: 1 },
  ]);
});
test("missing HTTP integration never fabricates appointment success", async () => {
  const { engine } = fixture();
  const g = graph(
    [
      node("entry", "entrypoint"),
      node("http", "http_request", { url: "https://clinic.example/slots" }),
      node("error", "response", { fixed_text: "Unavailable" }),
      node("end", "end_conversation"),
    ],
    [
      ["entry", "interaction_received", "http"],
      ["http", "failure", "error"],
      ["error", "message_sent", "end"],
    ],
  );
  const a = await run(engine, g);
  assert.deepEqual(a.messages, ["Unavailable"]);
  assert.ok(a.trace.steps.some((s) => s.node_id === "http" && s.status === "failed"));
});
test("missing knowledge and model dependencies fail honestly", async () => {
  for (const type of ["knowledge_search", "ai_prompt"] as const) {
    const { engine } = fixture();
    const g = graph(
      [
        node("entry", "entrypoint"),
        node("service", type, { instructions: "Answer", query_variable: "visitor.message" }),
      ],
      [["entry", "interaction_received", "service"]],
    );
    const r = await run(engine, g, "What are your hours?");
    assert.equal(r.status, "failed");
    assert.deepEqual(r.messages, []);
  }
});
test("immediate cycles fail at step budget rather than succeeding", async () => {
  const { engine } = fixture();
  const g = graph(
    [node("entry", "entrypoint"), node("loop", "condition", { rules: [] })],
    [
      ["entry", "interaction_received", "loop"],
      ["loop", "otherwise", "loop"],
    ],
  );
  assert.equal((await run(engine, g)).status, "failed");
});
test("variable paths reject prototype pollution", () => {
  assert.throws(() => setVariablePath("__proto__.polluted", true, {}), /Invalid/);
  assert.equal(resolveVariablePath("constructor.name", {}), undefined);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test("duplicate graph turn replays without emitting another message", async () => {
  const { engine } = fixture();
  const g = graph(
    [
      node("entry", "entrypoint"),
      node("reply", "response", { fixed_text: "Hello" }),
      node("end", "end_conversation"),
    ],
    [
      ["entry", "interaction_received", "reply"],
      ["reply", "message_sent", "end"],
    ],
  );
  let emitted = 0;
  const request = {
    workspaceId: "a",
    agentId: "agent",
    conversationId: "c",
    sessionId: "s",
    graph: g,
    releaseId: null,
    channel: "chat" as const,
    isPreview: true,
    requestId: "request",
    idempotencyKey: "same-turn",
    visitorMessage: "Hi",
    onAssistantMessage: async () => {
      emitted++;
    },
  };
  const first = await engine.executeTurn(request),
    second = await engine.executeTurn(request);
  assert.equal(emitted, 1);
  assert.equal(first.runId, second.runId);
  await assert.rejects(
    engine.executeTurn({ ...request, visitorMessage: "Changed" }),
    /different message/,
  );
});

test("mutating tools stay suspended until exact confirmation and cannot bypass it", async () => {
  const store = new GraphSessionStore();
  let calls = 0;
  const executor = {
    execute: async () => {
      calls++;
      return { ok: true, status: "succeeded", content: '{"status":"confirmed"}' };
    },
  } as unknown as import("../services/tool-executor.js").ToolExecutor;
  const engine = new GraphEngine(new GraphNodeRegistry({ toolExecutor: executor }), store);
  const g = graph(
    [
      node("entry", "entrypoint"),
      node("book", "http_request", {
        tool_id: "tool",
        require_confirmation: false,
        parameter_mappings: { slot: "visitor.slot" },
        output_variable: "booking",
      }),
      node("end", "end_conversation"),
    ],
    [
      ["entry", "interaction_received", "book"],
      ["book", "success", "end"],
    ],
  );
  const session = {
    session_id: "session",
    workspace_id: "a",
    agent_id: "agent",
    release_id: null,
    is_preview: true,
    channel: "chat" as const,
    status: "active" as const,
    current_node_id: "entry",
    variables: { visitor: { slot: "09:00" } },
    agent_defaults: {
      instructions: "",
      model_settings: {},
      tools: [
        {
          id: "tool",
          type: "http" as const,
          name: "book",
          description: "Book an appointment",
          base_url: "https://clinic.example",
          method: "POST" as const,
          allowed_hosts: ["clinic.example"],
          parameters: {
            type: "object" as const,
            properties: { slot: { type: "string" } },
            required: ["slot"],
          },
        },
      ],
    },
    turn_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await store.saveSession(session);
  const first = await run(engine, g, "book an appointment");
  assert.equal(first.status, "waiting_for_input");
  assert.equal(first.currentNodeId, "book");
  assert.equal(calls, 0);
  const declined = await run(engine, g, "not yes, do not book");
  assert.equal(declined.status, "waiting_for_input");
  assert.equal(calls, 0);
  const confirmed = await run(engine, g, "yes");
  assert.equal(confirmed.status, "completed");
  assert.equal(calls, 1);
});
test("handoff waits for explicit authoritative release before resuming", async () => {
  const { engine } = fixture();
  const g = graph(
    [
      node("entry", "entrypoint"),
      node("handoff", "human_handoff", { handoff_message: "Connecting", resume_node_id: "end" }),
      node("end", "end_conversation", { closing_message: "Resumed" }),
    ],
    [
      ["entry", "interaction_received", "handoff"],
      ["handoff", "resumed", "end"],
    ],
  );
  const first = await run(engine, g);
  assert.equal(first.status, "handed_off");
  await assert.rejects(run(engine, g, "Hello"), /human operator/);
  const released = await engine.executeTurn({
    workspaceId: "a",
    agentId: "agent",
    conversationId: "conversation",
    sessionId: "session",
    graph: g,
    releaseId: null,
    channel: "chat",
    isPreview: true,
    requestId: "release",
    humanReleased: true,
    visitorMessage: "Hello",
  });
  assert.equal(released.status, "completed");
});
