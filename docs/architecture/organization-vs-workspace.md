# Organization versus Workspace Architecture

This document defines the structural boundary between **Organizations** and **Workspaces**, the multi-tenant isolation model, role-based access control (RBAC), and the Insecure Direct Object Reference (IDOR) test matrix required for **Slot 05 (Workspace and tenancy)**.

---

## 1. Conceptual Distinction

In QuickStart AI, tenancy is structured in a clear two-tier hierarchy:

```text
Organization (Billing & Legal Root)
   │
   ├── Workspace A (e.g. Customer Support)
   │     ├── Agents
   │     ├── Knowledge Bases
   │     └── Conversations
   │
   └── Workspace B (e.g. Internal IT & Sales)
         ├── Agents
         ├── Knowledge Bases
         └── Conversations
```

### Organization (Billing & Legal Boundary)
- **What it represents:** An Organization represents the legal company or business entity that signs the contract, pays the invoices, and owns the root account (e.g., *Acme Corp*).
- **Scope of ownership:** Billing plans, payment methods, company-wide invoices, top-level compliance, and root organization-level API keys live exclusively at the Organization level.
- **Membership:** A user belongs to an Organization via `org_memberships`. Being an organization member does not automatically grant access to every project or workspace within that organization.

### Workspace (Operational & Execution Boundary)
- **What it represents:** A Workspace is an isolated operational environment (project, team, or department) where runtime artifacts live.
- **Scope of ownership:** AI Agents, knowledge bases, documents, vector indexes, conversation sessions, channel widgets, and webhook integrations live inside a Workspace.
- **Tenant Key:** For all operational resources in the platform, **`tenant_id` refers directly to `workspace_id`**.
- **Membership:** A user is granted explicit membership in a workspace via `workspace_memberships` with one of the six designated workspace roles. A single user can belong to multiple workspaces with completely different roles (for example, *Admin* in Support, but *Viewer/Analyst* in Sales).

---

## 2. Multi-Tenant Shared-Schema Architecture

QuickStart AI operates a **shared-schema multi-tenant model** in PostgreSQL.

### Why Shared Schema
1. **Scale target:** The platform is architected for 10,000+ organizations and 100,000+ configured agents.
2. **Operational sustainability:** Maintaining 10,000 separate PostgreSQL databases or 10,000 separate database schemas would introduce unmanageable connection pooling exhaustion and require schema migrations to execute 10,000 times per deployment.
3. **Data isolation guarantee:** Every table holding operational tenant data carries an indexed `workspace_id UUID NOT NULL` (aliased as `tenant_id`).

### The `TenantContext` Contract
Isolation is enforced at the repository interface level, never left as an optional parameter or controller afterthought:

- Every repository read and write method **strictly requires** a `TenantContext` object:
  ```typescript
  export interface TenantContext {
    readonly workspaceId: string;
    readonly actorId: string;
  }
  ```
- **Staff-level rule:** Any repository method that accepts an optional `workspaceId` is treated as a severe security defect.
- **Statelessness across replicas:** In a multi-pod Kubernetes deployment, no replica may store the "current tenant" in Node.js process memory. The tenant identity must be extracted per request from the verified gateway authentication header (`x-quickstart-auth-context`) and passed explicitly down the call stack.

---

## 3. The Six Workspace Roles & Permission Matrix

Rather than scattering hard-coded role checks like `if (user.role === 'admin')` across services, authorization is strictly evaluated via **granular permission strings** using `requirePermission()`.

### The 6 Defined Roles

| Role | Intended Persona | Core Capabilities |
| :--- | :--- | :--- |
| **Owner** | Workspace Creator / Lead | Full administrative control, delete workspace, manage all members and roles. |
| **Admin** | Engineering Lead / Manager | Manage agents, invite members, modify configurations, update integrations. |
| **Developer** | AI / Prompt Engineer | Create, configure, test, and publish AI agents; ingest knowledge bases. |
| **Operator** | Live Operations Lead | Monitor live conversations, trigger human handoffs, view transcripts. |
| **Analyst** | Business / Data Analyst | Read conversation analytics, inspect usage dashboards and cost reports. |
| **Human Agent** | Support Specialist | Intervene in live chats and voice calls during human escalation. |

### Standard Permission Strings
Permissions follow the `<domain>.<resource>.<action>` format:
- `workspace.agent.create`
- `workspace.agent.read`
- `workspace.agent.update`
- `workspace.agent.publish`
- `workspace.agent.delete`
- `workspace.member.invite`
- `workspace.member.update_role`
- `workspace.analytics.read`

### The Crucial "Analyst Cannot Publish" Invariant
An **Analyst** must have read access to analytics and conversation metrics to perform evaluations. However, an Analyst must be **strictly prohibited** from publishing or modifying agents:
- When an Analyst attempts `POST /workspaces/:workspaceId/agents/:id/publish`, the authorization guard must reject the request with `403 Forbidden` (`ErrorCode.FORBIDDEN`).
- Even before the full publish engine lands in later slots, this denial is verified via automated tests to prove the permission boundary is actively enforced.

---

## 4. Insecure Direct Object Reference (IDOR) Threat Matrix

An Insecure Direct Object Reference (IDOR) occurs when an application exposes a direct identifier to an internal object without verifying that the requesting actor belongs to the tenant that owns the object.

### Threat Scenarios & Mitigations

#### Scenario 1: Cross-Tenant Resource Reading
- **Attack:** User in Workspace A makes a request to `GET /v1/workspaces/workspace-b/agents/agent-102`.
- **Flawed Code:**
  ```sql
  SELECT * FROM agents WHERE id = 'agent-102'; -- VULNERABLE: Disregards tenant context!
  ```
- **Enforced Mitigation:**
  ```sql
  SELECT * FROM agents WHERE id = 'agent-102' AND workspace_id = $tenantContext.workspaceId;
  ```
- **Expected Result:** Query returns zero rows; API responds with `404 Not Found` (fail-closed, leaking no information about resource existence).

#### Scenario 2: Cross-Tenant Role Escalation
- **Attack:** Admin of Workspace A submits `PATCH /v1/workspaces/workspace-b/members/user-5` attempting to elevate `user-5` to `Owner`.
- **Enforced Mitigation:** The membership update query filters by both target member ID and the authenticated user's workspace ID, and verifies the actor holds `workspace.member.update_role` in that specific workspace.
- **Expected Result:** `403 Forbidden` or `404 Not Found`.

#### Scenario 3: Cross-Tenant Workspace Invites
- **Attack:** User authenticated in Workspace A sends an invitation payload targeting Workspace B: `POST /v1/workspaces/workspace-b/invites`.
- **Enforced Mitigation:** Route parameter validation matches the URL workspace ID against the caller's validated `TenantContext`.
- **Expected Result:** Rejection prior to database write with `403 Forbidden`.

---

## 5. Concurrent Role Updates & Race Conditions

When two administrators update a member's role at the exact same millisecond (e.g., Admin 1 changes role to *Developer* while Admin 2 changes role to *Analyst*):
- The repository must use **optimistic concurrency** (checking a `version` column) or execute within a transaction with `SELECT ... FOR UPDATE`.
- The member record stores an audit trail: `role_updated_at` and `role_updated_by` to maintain traceability for security audits.
