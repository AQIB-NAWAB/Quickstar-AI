import { randomUUID } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { IdentityStore } from "../repository/types.js";

export function createOrganizationsService(repository: IdentityStore) {
  return {
    async getOrganization(orgId: string, userId: string) {
      const membership = await repository.getMembership(orgId, userId);
      if (!membership) {
        throw new AppError({ code: ErrorCode.FORBIDDEN, message: "Not a member of organization" });
      }
      const org = await repository.getOrganization(orgId);
      if (!org) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Organization not found" });
      }
      return { id: org.id, name: org.name, role: membership.role };
    },

    async listOrganizations(userId: string) {
      const organizations = await repository.listOrganizationsForUser(userId);
      return organizations.map((o) => ({ id: o.id, name: o.name }));
    },

    async createOrganization(userId: string, input: { name?: string }) {
      const name = input?.name?.trim();
      if (!name || name.length < 1 || name.length > 100) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Organization name must be between 1 and 100 characters",
        });
      }
      const orgId = randomUUID();
      const org = await repository.createOrganization({ orgId, name, userId });
      return { id: org.id, name: org.name, role: "owner" as const };
    },

    async updateOrganization(orgId: string, userId: string, input: { name?: string }) {
      const membership = await repository.getMembership(orgId, userId);
      if (!membership) {
        throw new AppError({ code: ErrorCode.FORBIDDEN, message: "Not a member of organization" });
      }
      if (membership.role !== "owner") {
        throw new AppError({
          code: ErrorCode.FORBIDDEN,
          message: "Only organization owners can update the organization",
        });
      }
      const name = input?.name?.trim();
      if (!name || name.length < 1 || name.length > 100) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Organization name must be between 1 and 100 characters",
        });
      }
      const updated = await repository.updateOrganization(orgId, name);
      if (!updated) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Organization not found" });
      }
      return { id: updated.id, name: updated.name, role: membership.role };
    },

    async verifyMembership(orgId: string, userId: string) {
      const membership = await repository.getMembership(orgId, userId);
      return {
        isMember: Boolean(membership),
        role: membership?.role ?? null,
      };
    },
  };
}

export type OrganizationsService = ReturnType<typeof createOrganizationsService>;
