import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceDataSource } from "../repository/typeorm/data-source.js";
import { createTypeOrmWorkspaceStore } from "../repository/typeorm/workspace-typeorm-store.js";
import { WorkspacesService } from "../services/workspaces.service.js";

const runIntegration = process.env.WORKSPACE_INTEGRATION_TEST === "1";

test("postgres workspace creation and retrieval round-trip", { skip: !runIntegration }, async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL required for integration test");
  }

  const dataSource = createWorkspaceDataSource(databaseUrl);
  await dataSource.initialize();
  const store = createTypeOrmWorkspaceStore(dataSource);
  const workspaces = new WorkspacesService(store);

  const slug = `ws-pg-${Date.now()}`;
  const orgId = "00000000-0000-0000-0000-000000000001";
  const ownerUserId = "00000000-0000-0000-0000-000000000101";

  const created = await workspaces.createWorkspace({
    orgId,
    name: "PG Integration Workspace",
    slug,
    ownerUserId,
  });

  assert.equal(created.slug, slug);

  const fetched = await workspaces.getWorkspace({
    workspaceId: created.id,
    actorId: ownerUserId,
  });
  assert.equal(fetched.id, created.id);

  await dataSource.destroy();
});
