import { AppError, ErrorCode } from "@quickstart/errors";
import type { IdentityStore } from "../repository/types.js";

export function createUsersService(repository: IdentityStore) {
  return {
    async getProfile(userId: string) {
      const user = await repository.findUserById(userId);
      if (!user) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "User not found" });
      }
      const organizations = await repository.listOrganizationsForUser(userId);
      return {
        user: { id: user.id, email: user.email },
        organizations: organizations.map((o) => ({ id: o.id, name: o.name })),
      };
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
