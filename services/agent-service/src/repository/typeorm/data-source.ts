import { DataSource } from "typeorm";
import { AgentEntity, AgentVersionEntity, CustomToolEntity } from "../entities/index.js";

export function createAgentDataSource(databaseUrl: string): DataSource {
  return new DataSource({
    type: "postgres",
    url: databaseUrl,
    synchronize: false,
    entities: [AgentEntity, AgentVersionEntity, CustomToolEntity],
  });
}
