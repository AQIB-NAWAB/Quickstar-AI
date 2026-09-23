import type { TenantContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { WorkspaceStore, CreateWorkspaceInput, UpdateWorkspaceInput } from "../repository/types.js";
import type { Workspace } from "../domain/types.js";

export class WorkspacesService {
  constructor(private readonly store: WorkspaceStore) {}

  async createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
    if (!input.name || input.name.trim().length === 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Workspace name is required",
      });
    }

    if (!input.slug || input.slug.trim().length === 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Workspace slug is required",
      });
    }

    const { workspace } = await this.store.createWorkspace(input);
    return workspace;
  }

  async listWorkspacesByOrg(orgId: string, actorUserId: string): Promise<Workspace[]> {
    return this.store.listWorkspacesByOrg(orgId, actorUserId);
  }

  async getWorkspace(tenant: TenantContext): Promise<Workspace> {
    const ws = await this.store.getWorkspace(tenant);
    if (!ws) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Workspace not found",
      });
    }
    return ws;
  }

  async updateWorkspace(tenant: TenantContext, input: UpdateWorkspaceInput): Promise<Workspace> {
    return this.store.updateWorkspace(tenant, input);
  }

  async deleteWorkspace(tenant: TenantContext): Promise<void> {
    const deleted = await this.store.deleteWorkspace(tenant);
    if (!deleted) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Workspace not found",
      });
    }
  }
}
