import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("conversations")
export class ConversationEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId!: string;

  @Column({ name: "agent_id", type: "uuid", nullable: true })
  agentId!: string | null;

  @Column({ name: "last_seq", type: "int", default: 0 })
  lastSeq!: number;

  @Column({ name: "subject_key", type: "varchar", length: 255, nullable: true })
  subjectKey!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
