import type { TenantContext } from "@quickstart/auth";
import {
  MAX_CUSTOM_TOOLS_PER_WORKSPACE,
  type CustomTool,
  type CustomToolInput,
  type CustomToolUpdate,
} from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import { validateCustomToolInput } from "../lib/validate-tools.js";
import type { CustomToolStore } from "../repository/types.js";

export class CustomToolsService {
  constructor(private readonly store: CustomToolStore) {}

  async createCustomTool(tenant: TenantContext, input: CustomToolInput): Promise<CustomTool> {
    const validated = validateCustomToolInput(input);
    const count = await this.store.countCustomTools(tenant);
    if (count >= MAX_CUSTOM_TOOLS_PER_WORKSPACE) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `At most ${MAX_CUSTOM_TOOLS_PER_WORKSPACE} custom tools per workspace`,
      });
    }
    return this.store.createCustomTool(tenant, validated);
  }

  listCustomTools(tenant: TenantContext): Promise<CustomTool[]> {
    return this.store.listCustomTools(tenant);
  }

  async getCustomTool(tenant: TenantContext, toolId: string): Promise<CustomTool> {
    const tool = await this.store.getCustomTool(tenant, toolId);
    if (!tool) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Custom tool not found" });
    }
    return tool;
  }

  async updateCustomTool(
    tenant: TenantContext,
    toolId: string,
    input: CustomToolUpdate,
  ): Promise<CustomTool> {
    const existing = await this.getCustomTool(tenant, toolId);
    const merged: CustomToolInput = {
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      kind: input.kind ?? existing.kind,
      config: input.config ?? existing.config,
    };
    const validated = validateCustomToolInput(merged);
    return this.store.updateCustomTool(tenant, toolId, validated);
  }

  async deleteCustomTool(tenant: TenantContext, toolId: string): Promise<void> {
    const deleted = await this.store.deleteCustomTool(tenant, toolId);
    if (!deleted) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Custom tool not found" });
    }
  }
}
