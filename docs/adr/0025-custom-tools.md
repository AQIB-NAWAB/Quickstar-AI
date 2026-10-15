# ADR 0025 — Workspace custom tools registry with secret-backed auth

**Status:** Accepted
**Date:** 2026-10-15

## Context

Agents already execute tools through the runtime tool loop (ADR 0015): `http`,
`builtin_web`, `mcp`, and `builtin_leads` definitions are validated by the agent
service, frozen into published version snapshots, and executed idempotently with
per-call audit records. However, there was no way for a workspace admin to _author_
real tools: the agent editor's tool catalog was a hardcoded, invalid placeholder,
widget text turns rejected tools outright, and customer HTTP APIs could not
authenticate.

## Decision

1. **Workspace custom tool registry in the agent service.** A new `custom_tools`
   table (migration `005_custom_tools.sql`) stores admin-authored HTTP and MCP
   tool configs per workspace (unique name per workspace, capped at
   `MAX_CUSTOM_TOOLS_PER_WORKSPACE` = 50). CRUD lives under
   `/v1/workspaces/:workspaceId/custom-tools` with the existing `AGENT_*`
   permissions (`AGENT_READ`/`AGENT_CREATE`/`AGENT_UPDATE`/`AGENT_DELETE`).

2. **Attaching inlines the definition.** When an admin attaches a custom tool in
   the agent editor, the full `AgentToolDefinition` (converted by
   `toAgentToolDefinition`) is inlined into `agents.tools`. Storage, validation,
   publishing, and execution are unchanged; published snapshots remain
   self-contained even if the workspace tool is later edited or deleted.

3. **Secret-backed HTTP auth.** HTTP tools may declare
   `auth: { type: "bearer_secret", secret_name }` plus static headers. Static
   `authorization` / `x-api-key` headers are rejected at validation time. The
   runtime resolves the secret at call time via the secrets service internal
   reveal endpoint (`/internal/workspaces/:ws/secrets/:name/value`) and injects
   it as a `Bearer` token. Secrets are never persisted on the tool or the agent.

4. **Widget text turns support tools.** The widget turn path now passes
   `allowTools: true` for both text and voice, so published agents can call tools
   for website visitors. Voice transfer handling is unchanged.

5. **Parameter schemas stay shallow.** Tool parameters support
   `string|number|integer|boolean|array|object` properties with `enum`, `items`,
   and `required`, authored in the Custom tools settings modal and passed through
   to the model gateway as-is.

## Consequences

- Admins get a settings tab (Custom tools) plus an agent-editor attach/detach
  picker fed by the registry; the platform built-ins (web scrape/search, lead
  runs) remain attachable alongside custom tools.
- Security posture is preserved: SSRF guards (non-private hosts, allow-list)
  still apply to custom tools, credentials stay in the secrets vault, and tool
  executions remain audited and idempotent in the conversation service.
- Follow-ups explicitly out of scope here: streaming tool-call deltas through
  `/internal/stream`, `tool_choice` passthrough, and Anthropic provider tool
  mapping.
