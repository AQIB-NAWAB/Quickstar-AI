import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("org_memberships")
export class OrgMembershipEntity {
  @PrimaryColumn({ name: "org_id", type: "uuid" })
  orgId!: string;

  @PrimaryColumn({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ type: "text" })
  role!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
