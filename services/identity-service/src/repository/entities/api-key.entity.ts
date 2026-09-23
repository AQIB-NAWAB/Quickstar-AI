import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("api_keys")
export class ApiKeyEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "org_id", type: "uuid" })
  orgId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ name: "key_prefix", type: "text" })
  keyPrefix!: string;

  @Column({ name: "key_hash", type: "text" })
  keyHash!: string;

  @Column({ name: "created_by", type: "uuid" })
  createdBy!: string;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
