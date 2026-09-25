import { DataSource } from "typeorm";
import { ConversationEntity, MessageEntity } from "../entities/index.js";

export function createConversationDataSource(databaseUrl: string): DataSource {
  return new DataSource({
    type: "postgres",
    url: databaseUrl,
    synchronize: false,
    entities: [ConversationEntity, MessageEntity],
  });
}
