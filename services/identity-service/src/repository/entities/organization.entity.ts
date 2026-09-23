import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("organizations")
export class OrganizationEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  name!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
