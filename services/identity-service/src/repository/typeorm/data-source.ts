import { DataSource } from "typeorm";
import {
  ApiKeyEntity,
  OrgMembershipEntity,
  OrganizationEntity,
  RefreshTokenEntity,
  UserEntity,
  PasswordResetEntity,
} from "../entities/index.js";

/** Postgres connection for Identity. Schema is applied via SQL migrations (`pnpm migrate`), not synchronize. */
export function createIdentityDataSource(databaseUrl: string): DataSource {
  return new DataSource({
    type: "postgres",
    url: databaseUrl,
    synchronize: false,
    entities: [
      UserEntity,
      OrganizationEntity,
      OrgMembershipEntity,
      RefreshTokenEntity,
      ApiKeyEntity,
      PasswordResetEntity,
    ],
  });
}
