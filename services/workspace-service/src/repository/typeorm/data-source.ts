import { DataSource } from "typeorm";
import {
  WorkspaceEntity,
  WorkspaceMembershipEntity,
  WorkspaceInviteEntity,
} from "../entities/index.js";

/** Postgres connection for Workspace service. Schema is applied via SQL migrations (`pnpm migrate`), not synchronize. */
export function createWorkspaceDataSource(databaseUrl: string): DataSource {
  return new DataSource({
    type: "postgres",
    url: databaseUrl,
    synchronize: false,
    entities: [
      WorkspaceEntity,
      WorkspaceMembershipEntity,
      WorkspaceInviteEntity,
    ],
  });
}
