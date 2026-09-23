import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";
import type { WorkspaceRole } from "../../domain/permissions.js";

@Entity("workspace_memberships")
export class WorkspaceMembershipEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", length: 50 })
  role!: WorkspaceRole;

  @Column({ name: "role_updated_at", type: "timestamptz" })
  roleUpdatedAt!: Date;

  @Column({ name: "role_updated_by", type: "uuid", nullable: true })
  roleUpdatedBy!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
