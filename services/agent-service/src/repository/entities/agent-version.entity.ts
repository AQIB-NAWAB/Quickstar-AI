import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";
import type { AgentSnapshot } from "../../domain/types.js";

@Entity("agent_versions")
export class AgentVersionEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId!: string;

  @Column({ name: "agent_id", type: "uuid" })
  agentId!: string;

  @Column({ name: "release_number", type: "int" })
  releaseNumber!: number;

  @Column({ type: "jsonb" })
  snapshot!: AgentSnapshot;

  @Column({ name: "release_notes", type: "text", nullable: true })
  releaseNotes!: string | null;

  @Column({ name: "created_by", type: "varchar", length: 255 })

  createdBy!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
