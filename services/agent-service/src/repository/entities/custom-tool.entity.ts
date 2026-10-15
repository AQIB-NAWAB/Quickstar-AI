import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";
import type { CustomToolConfig, CustomToolKind } from "@quickstart/contracts";

@Entity("custom_tools")
export class CustomToolEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 16 })
  kind!: CustomToolKind;

  @Column({ type: "jsonb", default: {} })
  config!: CustomToolConfig;

  @Column({ name: "created_by", type: "varchar", length: 255 })
  createdBy!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
