import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { createConversationDataSource } from "../repository/typeorm/data-source.js";
import { createTypeOrmConversationStore } from "../repository/typeorm/conversation-typeorm-store.js";
import { ConversationsService } from "../services/conversations.service.js";

const runIntegration = process.env.CONVERSATION_INTEGRATION_TEST === "1";

test(
  "postgres conversation and message append with sequence counter and idempotency",
  { skip: !runIntegration },
  async () => {
    const databaseUrl =
      process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart";

    const dataSource = createConversationDataSource(databaseUrl);
    await dataSource.initialize();
    const store = createTypeOrmConversationStore(dataSource);
    const conversations = new ConversationsService(store);

    const workspaceA = "00000000-0000-4000-8000-0000000000a1";
    const workspaceB = "00000000-0000-4000-8000-0000000000b2";

    // 1. Create conversation
    const conversation = await conversations.createConversation(workspaceA);
    assert.ok(conversation.id);
    assert.equal(conversation.workspaceId, workspaceA);
    assert.equal(conversation.lastSeq, 0);

    // 2. Append first message
    const msg1Result = await conversations.appendMessage({
      workspaceId: workspaceA,
      conversationId: conversation.id,
      text: "First PostgreSQL message",
      idempotencyKey: "idem-pg-001",
      senderType: "user",
      senderId: "user-1",
    });
    assert.equal(msg1Result.deduplicated, false);
    assert.equal(msg1Result.message.seq, 1);
    assert.equal(msg1Result.message.text, "First PostgreSQL message");

    // 3. Retry with same idempotency key
    const msg1Retry = await conversations.appendMessage({
      workspaceId: workspaceA,
      conversationId: conversation.id,
      text: "First PostgreSQL message retry",
      idempotencyKey: "idem-pg-001",
      senderType: "user",
      senderId: "user-1",
    });
    assert.equal(msg1Retry.deduplicated, true);
    assert.equal(msg1Retry.message.id, msg1Result.message.id);
    assert.equal(msg1Retry.message.seq, 1);

    // 4. Append second message with different key -> seq should be 2
    const msg2Result = await conversations.appendMessage({
      workspaceId: workspaceA,
      conversationId: conversation.id,
      text: "Second PostgreSQL message",
      idempotencyKey: "idem-pg-002",
      senderType: "user",
      senderId: "user-1",
    });
    assert.equal(msg2Result.deduplicated, false);
    assert.equal(msg2Result.message.seq, 2);

    // 5. Verify conversation lastSeq updated in DB
    const fetchedConv = await conversations.getConversation(workspaceA, conversation.id);
    assert.equal(fetchedConv.lastSeq, 2);

    // 6. List messages
    const messages = await conversations.listMessages(workspaceA, conversation.id);
    assert.equal(messages.length, 2);
    assert.equal(messages[0].seq, 1);
    assert.equal(messages[1].seq, 2);

    // 7. Verify cross-workspace access fails with 404
    await assert.rejects(
      async () => {
        await conversations.getConversation(workspaceB, conversation.id);
      },
      (err: unknown) => {
        const e = err as { code?: string; message?: string };
        return e?.code === "NOT_FOUND" || Boolean(e?.message?.includes("not found"));
      },
    );

    await dataSource.destroy();
  },
);
