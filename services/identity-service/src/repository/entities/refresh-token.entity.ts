import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("refresh_tokens")
export class RefreshTokenEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "session_id", type: "uuid" })
  sessionId!: string;

  @Column({ name: "token_hash", type: "text", unique: true })
  tokenHash!: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "replaced_by_id", type: "uuid", nullable: true })
  replacedById!: string | null;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
