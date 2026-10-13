/**
 * Point the demo support agent at a real model-gateway profile (not fake) and publish.
 *
 * Uses fixtures/quickstart-demo-account.live.json for workspace + agent ids.
 * Reads model from env:
 *   CHAT_MODEL_PROFILE  (default: groq if GROQ_API_KEY in env, else openai)
 *   CHAT_MODEL_ID       (default: openai/gpt-oss-20b for groq, gpt-4o-mini for openai)
 *
 *   node --env-file=.env scripts/configure-demo-agent-real-llm.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const livePath = join(root, "fixtures/quickstart-demo-account.live.json");
const gateway = (process.env.GATEWAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

if (!existsSync(livePath)) {
  console.error("Run pnpm seed:demo first.");
  process.exit(1);
}

const live = JSON.parse(readFileSync(livePath, "utf8"));
const { email, password } = live.account;
const workspaceId = live.workspace_id;
const agentId = live.agent_id;

const profile =
  process.env.CHAT_MODEL_PROFILE?.trim() ||
  (process.env.GROQ_API_KEY ? "groq" : process.env.OPENAI_API_KEY ? "openai" : "");
const modelId =
  process.env.CHAT_MODEL_ID?.trim() ||
  (profile === "groq" ? "openai/gpt-oss-20b" : "gpt-4o-mini");

if (!profile) {
  console.error("Set OPENAI_API_KEY or GROQ_API_KEY in .env, or set CHAT_MODEL_PROFILE explicitly.");
  process.exit(1);
}

async function request(url, { method = "GET", token, body, status } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (status !== undefined && res.status !== status) {
    throw new Error(`${method} ${url} → ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return { status: res.status, data };
}

const login = await request(`${gateway}/v1/login`, {
  method: "POST",
  body: { email, password },
});
if (login.status !== 200 && login.status !== 201) {
  throw new Error(`login failed: ${login.status}`);
}
const token = login.data.tokens?.access_token ?? login.data.access_token;
if (!token) throw new Error("login response missing access_token");
const ws = `${gateway}/v1/workspaces/${workspaceId}`;

const getAgent = await request(`${ws}/agents/${agentId}`, { token });
const agent = getAgent.data.agent;
if (!agent) throw new Error("agent not found");

await request(`${ws}/agents/${agentId}`, {
  method: "PATCH",
  token,
  status: 200,
  body: {
    expected_version: agent.version,
    model_settings: {
      profile,
      model_id: modelId,
      model: modelId,
      temperature: 0.3,
      max_tokens: 1024,
    },
  },
});

const refreshed = await request(`${ws}/agents/${agentId}`, { token });
const published = await request(`${ws}/agents/${agentId}/publish`, {
  method: "POST",
  token,
  status: 201,
  body: { base_version: refreshed.data.agent.version },
});

console.log("Demo agent now uses real LLM:");
console.log(`  profile: ${profile}`);
console.log(`  model_id: ${modelId}`);
console.log(`  published version: ${published.data.version?.id ?? "ok"}`);
console.log("");
console.log("Restart model-gateway and runtime if they were started before API keys were set.");
console.log("Then hard-refresh http://127.0.0.1:8080/ and send a new message (or clear site data to reset chat).");
