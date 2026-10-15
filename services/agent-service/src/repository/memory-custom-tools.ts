import { randomUUID } from "node:crypto";
import type { TenantContext } from "@quickstart/auth";
import type { CustomTool, CustomToolInput, CustomToolUpdate } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { CustomToolStore } from "./types.js";

/** In-memory custom tool store for tests. */
export class MemoryCustomToolStore implements CustomToolStore {
  private tools = new Map<string, CustomTool>();

  async createCustomTool(tenant: TenantContext, input: CustomToolInput): Promise<CustomTool> {
    const existing = [...this.tools.values()].find(
      (tool) => tool.workspace_id === tenant.workspaceId && tool.name === input.name.trim(),
    );
    if (existing) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: `Custom tool '${input.name}' already exists in this workspace`,
      });
    }
    const now = new Date().toISOString();
    const tool: CustomTool = {
      id: randomUUID(),
      workspace_id: tenant.workspaceId,
      name: input.name.trim(),
      description: input.description?.trim() || "",
      kind: input.kind,
      config: input.config,
      created_by: tenant.actorId ?? "unknown",
      created_at: now,
      updated_at: now,
    };
    this.tools.set(tool.id, tool);
    return tool;
  }

  async listCustomTools(tenant: TenantContext): Promise<CustomTool[]> {
    return [...this.tools.values()].filter((tool) => tool.workspace_id === tenant.workspaceId);
  }

  async getCustomTool(tenant: TenantContext, toolId: string): Promise<CustomTool | null> {
    const tool = this.tools.get(toolId);
    return tool && tool.workspace_id === tenant.workspaceId ? tool : null;
  }

  async updateCustomTool(
    tenant: TenantContext,
    toolId: string,
    input: CustomToolUpdate,
  ): Promise<CustomTool> {
    const tool = await this.getCustomTool(tenant, toolId);
    if (!tool) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Custom tool not found" });
    }
    if (
      input.name !== undefined &&
      [...this.tools.values()].some(
        (other) =>
          other.workspace_id === tenant.workspaceId &&
          other.id !== toolId &&
          other.name === input.name?.trim(),
      )
    ) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: `Custom tool '${input.name}' already exists in this workspace`,
      });
    }
    const updated: CustomTool = {
      ...tool,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() || "" } : {}),
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.config !== undefined ? { config: input.config } : {}),
      updated_at: new Date().toISOString(),
    };
    this.tools.set(toolId, updated);
    return updated;
  }

  async deleteCustomTool(tenant: TenantContext, toolId: string): Promise<boolean> {
    const tool = await this.getCustomTool(tenant, toolId);
    if (!tool) return false;
    return this.tools.delete(toolId);
  }

  async countCustomTools(tenant: TenantContext): Promise<number> {
    return (await this.listCustomTools(tenant)).length;
  }
}
