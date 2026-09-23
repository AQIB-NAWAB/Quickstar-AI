import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";
import type { WorkspaceRole } from "../../domain/permissions.js";

@Entity("workspace_invites")
export class WorkspaceInviteEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "varchar", length: 50 })
  role!: WorkspaceRole;

  @Column({ name: "token_hash", type: "varchar", length: 64 })
  tokenHash!: string;

  @Column({ name: "invited_by", type: "uuid" })
  invitedBy!: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
