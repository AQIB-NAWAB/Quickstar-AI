import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("agents")
export class AgentEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "text", default: "" })
  instructions!: string;

  @Column({ type: "varchar", length: 50, default: "draft" })
  environment!: string;

  @Column({ name: "model_settings", type: "jsonb", default: {} })
  modelSettings!: Record<string, unknown>;

  @Column({ type: "jsonb", default: { chat: true, voice: false } })
  channels!: { chat: boolean; voice: boolean };

  @Column({ type: "jsonb", default: [] })
  tools!: import("@quickstart/contracts").AgentToolDefinition[];

  @Column({ type: "jsonb", default: {} })
  voice!: import("@quickstart/contracts").AgentVoiceSettings;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ name: "production_version_id", type: "uuid", nullable: true })
  productionVersionId!: string | null;

  @Column({ name: "builder_mode", type: "varchar", length: 32, default: "legacy" })
  builderMode!: "legacy" | "canvas";

  @Column({ name: "draft_graph", type: "jsonb", nullable: true })
  draftGraph!: import("@quickstart/contracts").AgentGraph | null;

  @Column({ name: "graph_schema_version", type: "int", default: 1 })
  graphSchemaVersion!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;


  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
