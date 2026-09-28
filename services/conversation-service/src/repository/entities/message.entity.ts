import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("messages")
export class MessageEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId!: string;

  @Column({ name: "conversation_id", type: "uuid" })
  conversationId!: string;

  @Column({ type: "int" })
  seq!: number;

  @Column({ name: "sender_type", type: "varchar", length: 50 })
  senderType!: string;

  @Column({ name: "sender_id", type: "varchar", length: 255 })
  senderId!: string;

  @Column({ type: "text" })
  text!: string;

  @Column({ name: "idempotency_key", type: "varchar", length: 255 })
  idempotencyKey!: string;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
