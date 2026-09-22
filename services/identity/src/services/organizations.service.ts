import { AppError, ErrorCode } from "@quickstart/errors";
import type { IdentityStore } from "../repository/identity-store.types.js";

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
  };
}

export type OrganizationsService = ReturnType<typeof createOrganizationsService>;
