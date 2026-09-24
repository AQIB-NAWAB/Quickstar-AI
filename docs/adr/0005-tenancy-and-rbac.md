# ADR 0005: Tenancy and Role-Based Access Control (RBAC)

- **Status:** Accepted
- **Date:** 2026-09-24
- **Slot:** 05 — Workspace and tenancy

## Context

QuickStart AI is a multi-tenant platform designed for 10,000+ organizations and 100,000+ configured AI agents (`project_details.md` §12–13). Slot 04 introduced `services/identity-service` with users, organizations, and authentication tokens.

Operational resources (agents, knowledge bases, vector embeddings, conversations, tools) require an operational boundary separate from top-level corporate billing. Furthermore, every subsequent query across the entire microservice ecosystem will be tenant-scoped. We must establish the tenant isolation model and authorization mechanics before building agents and runtime pipelines.

## Decision

### 1. Two-Tier Tenancy Hierarchy
```text
Organization (Billing root, legal owner, org memberships, org API keys)
   ↓
Workspace (Operational project root, tenant isolation boundary for agents & data)
```
- An **Organization** is the billing and corporate boundary.
- A **Workspace** is the operational tenant boundary where agents, knowledge, and conversations live.
- Throughout platform services, **`tenant_id` refers directly to `workspace_id`**.

### 2. Shared-Schema Multi-Tenancy
- All workspaces share a single PostgreSQL database and common table schemas.
- Every table storing tenant data contains a mandatory `workspace_id UUID NOT NULL` foreign key and corresponding B-tree index.
- Row-level tenant isolation is enforced at the repository layer: every read, write, update, and delete query must explicitly include `WHERE workspace_id = $workspaceId`.

### 3. Mandatory `TenantContext` Contract
- Every repository method in workspace-scoped services requires an explicit `TenantContext` parameter:
  ```typescript
  export interface TenantContext {
    readonly workspaceId: string;
    readonly actorId: string;
  }
  ```
- Methods with optional tenant parameters are prohibited to eliminate Insecure Direct Object Reference (IDOR) vulnerabilities.
- Multi-replica processes must remain stateless: tenant identity is extracted per request from authenticated gateway headers (`x-quickstart-auth-context`) rather than stored in Node.js process memory.

### 4. Granular Permission Strings (PBAC) over Hardcoded Role Checks
Authorization is evaluated using permission strings formatted as `<domain>.<resource>.<action>` via a single unified guard `requirePermission()`:
- `workspace.agent.create`
- `workspace.agent.read`
- `workspace.agent.update`
- `workspace.agent.publish`
- `workspace.agent.delete`
- `workspace.member.invite`
- `workspace.member.update_role`
- `workspace.analytics.read`

Direct role comparisons (e.g. `if (user.role === 'admin')`) are rejected to avoid brittle cross-service search-and-replace refactorings when roles evolve.

### 5. Standard Roles
Six standard roles are supported:
1. **Owner:** Full workspace control, deletion, role assignment.
2. **Admin:** Agent and member management, configurations.
3. **Developer:** Agent creation, prompt tuning, knowledge ingestion, agent publishing.
4. **Operator:** Conversation monitoring, human handoffs, live transcripts.
5. **Analyst:** Inspection of analytics and conversation metrics; **strictly prohibited from publishing or mutating agents**.
6. **Human Agent:** Active intervention in live customer chats and calls.

## Consequences

- All future services (`services/agent`, `services/conversation`, `services/runtime`) will inherit the `TenantContext` pattern.
- Every write operation on member roles records audit fields (`role_updated_by`, `role_updated_at`).
- Automated test suites must include negative IDOR tests verifying that Workspace A cannot read or modify Workspace B entities under any parameter tampering.
- Permission lookups are performed against PostgreSQL and may be cached in Valkey/Redis with short TTLs for high-throughput paths (1,000+ RPS).

## Alternatives Rejected

| Alternative | Why Rejected |
| :--- | :--- |
| **Database-per-tenant** | Managing 10,000+ independent database instances introduces severe operational complexity and exhausts database connection pools. |
| **Schema-per-tenant** | Running schema migrations across 10,000 separate schemas would create excessive deployment latency and lock contention. |
| **Flat Single-Level Tenancy (Org = Workspace)** | Fails to accommodate enterprise customers who require distinct environments (e.g. staging vs. production, or sales vs. support) under a single consolidated billing entity. |
| **Role-based conditional branching** | Hardcoding role names directly in controllers prevents dynamic permission assignment and breaks runtime extensibility. |

## References

- `docs/project_details.md` — §12 (Multi-Tenant Architecture), §13 (Identity & Access Management), §41 (Platform Rules)
- `docs/architecture/organization-vs-workspace.md`
- `docs/roadmap.md` — Slot 05
