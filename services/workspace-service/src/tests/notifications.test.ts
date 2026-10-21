import assert from "node:assert/strict";
import test from "node:test";
import { AppError, ErrorCode } from "@quickstart/errors";
import { NotificationsService } from "../services/notifications.service.js";
import type {
  NotificationRow,
  NotificationsRepository,
} from "../repository/notifications.repository.js";

const VALID_WORKSPACE = "a0000000-0000-4000-a000-000000000001";
const OTHER_WORKSPACE = "b0000000-0000-4000-a000-000000000002";

function createMockRepository(rows: NotificationRow[] = []): NotificationsRepository {
  return {
    listByWorkspace: async (wsId: string, opts: any) => {
      let filtered = rows.filter((r) => r.workspace_id === wsId && !r.dismissed_at);
      if (opts.category) {
        filtered = filtered.filter((r) => r.category === opts.category);
      }
      if (opts.unreadOnly) {
        filtered = filtered.filter((r) => !r.read_at);
      }
      const unreadCount = rows.filter((r) => r.workspace_id === wsId && !r.read_at && !r.dismissed_at).length;
      return {
        rows: filtered.slice(0, opts.limit ?? 50),
        total: filtered.length,
        unreadCount,
      };
    },
    getUnreadCount: async (wsId: string) => {
      return rows.filter((r) => r.workspace_id === wsId && !r.read_at && !r.dismissed_at).length;
    },
    markAsRead: async (wsId: string, nId: string) => {
      const row = rows.find((r) => r.workspace_id === wsId && r.id === nId);
      if (!row) return null;
      row.read_at = new Date();
      return row;
    },
    markAllAsRead: async (wsId: string, category?: string) => {
      let count = 0;
      for (const r of rows) {
        if (r.workspace_id === wsId && !r.read_at && (!category || r.category === category)) {
          r.read_at = new Date();
          count++;
        }
      }
      return count;
    },
    dismissRead: async (wsId: string, category?: string) => {
      let count = 0;
      for (const r of rows) {
        if (r.workspace_id === wsId && r.read_at && !r.dismissed_at && (!category || r.category === category)) {
          r.dismissed_at = new Date();
          count++;
        }
      }
      return count;
    },
    create: async () => ({} as NotificationRow),
  } as unknown as NotificationsRepository;
}

test("NotificationsService validates workspace UUID", async () => {
  const service = new NotificationsService(createMockRepository());

  await assert.rejects(
    async () => service.list("invalid-uuid", {}),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, ErrorCode.VALIDATION_FAILED);
      return true;
    },
  );

  await assert.rejects(
    async () => service.getUnreadCount("invalid-uuid"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, ErrorCode.VALIDATION_FAILED);
      return true;
    },
  );
});

test("NotificationsService lists notifications and calculates unread counter", async () => {
  const mockRows: NotificationRow[] = [
    {
      id: "notif-1",
      workspace_id: VALID_WORKSPACE,
      recipient_user_id: null,
      category: "security",
      severity: "warning",
      type: "unauthorized_attempt",
      title: "Multiple failed sign-in attempts",
      description: "5 failed attempts detected from IP 192.0.2.1",
      source_type: "audit",
      source_id: "sec-1",
      source_name: "Security Watcher",
      action_url: "/security/audit",
      action_label: "Inspect audit log",
      deduplication_key: null,
      read_at: null,
      dismissed_at: null,
      created_at: new Date("2026-05-01T10:00:00Z"),
    },
    {
      id: "notif-2",
      workspace_id: VALID_WORKSPACE,
      recipient_user_id: null,
      category: "billing",
      severity: "error",
      type: "usage_cap_reached",
      title: "Workspace token quota reached",
      description: "Monthly token quota is at 98%",
      source_type: "billing",
      source_id: "plan-1",
      source_name: "Usage Engine",
      action_url: "/analytics",
      action_label: "View usage",
      deduplication_key: null,
      read_at: new Date("2026-05-01T11:00:00Z"),
      dismissed_at: null,
      created_at: new Date("2026-05-01T10:30:00Z"),
    },
    {
      id: "notif-3",
      workspace_id: OTHER_WORKSPACE,
      recipient_user_id: null,
      category: "security",
      severity: "info",
      type: "test",
      title: "Other workspace notif",
      description: "Should not appear",
      source_type: null,
      source_id: null,
      source_name: null,
      action_url: null,
      action_label: null,
      deduplication_key: null,
      read_at: null,
      dismissed_at: null,
      created_at: new Date("2026-05-01T10:00:00Z"),
    },
  ];

  const service = new NotificationsService(createMockRepository(mockRows));

  const listRes = await service.list(VALID_WORKSPACE, {});
  assert.equal(listRes.notifications.length, 2);
  assert.equal(listRes.total, 2);
  assert.equal(listRes.unread_count, 1);

  const unreadOnlyRes = await service.list(VALID_WORKSPACE, { unreadOnly: true });
  assert.equal(unreadOnlyRes.notifications.length, 1);
  assert.equal(unreadOnlyRes.notifications[0].id, "notif-1");

  const unreadCountRes = await service.getUnreadCount(VALID_WORKSPACE);
  assert.equal(unreadCountRes.unread_count, 1);
});

test("NotificationsService markAsRead updates read_at or throws NOT_FOUND", async () => {
  const mockRow: NotificationRow = {
    id: "notif-unread",
    workspace_id: VALID_WORKSPACE,
    recipient_user_id: null,
    category: "system",
    severity: "info",
    type: "agent_deployed",
    title: "Agent v2.0 deployed successfully",
    description: "Build 482 is now active in production.",
    source_type: "agent",
    source_id: "agent-1",
    source_name: "Customer Support Agent",
    action_url: null,
    action_label: null,
    deduplication_key: null,
    read_at: null,
    dismissed_at: null,
    created_at: new Date(),
  };

  const service = new NotificationsService(createMockRepository([mockRow]));

  const updated = await service.markAsRead(VALID_WORKSPACE, "notif-unread");
  assert.ok(updated.read_at !== null, "read_at must be populated after markAsRead");

  await assert.rejects(
    async () => service.markAsRead(VALID_WORKSPACE, "non-existent-id"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, ErrorCode.NOT_FOUND);
      return true;
    },
  );
});

test("NotificationsService markAllAsRead and dismissRead update items in workspace", async () => {
  const mockRows: NotificationRow[] = [
    {
      id: "notif-a",
      workspace_id: VALID_WORKSPACE,
      recipient_user_id: null,
      category: "security",
      severity: "warning",
      type: "alert",
      title: "Alert A",
      description: "Desc",
      source_type: null,
      source_id: null,
      source_name: null,
      action_url: null,
      action_label: null,
      deduplication_key: null,
      read_at: null,
      dismissed_at: null,
      created_at: new Date(),
    },
    {
      id: "notif-b",
      workspace_id: VALID_WORKSPACE,
      recipient_user_id: null,
      category: "system",
      severity: "info",
      type: "info",
      title: "Info B",
      description: "Desc",
      source_type: null,
      source_id: null,
      source_name: null,
      action_url: null,
      action_label: null,
      deduplication_key: null,
      read_at: null,
      dismissed_at: null,
      created_at: new Date(),
    },
  ];

  const service = new NotificationsService(createMockRepository(mockRows));

  // Mark only category 'security' as read
  const markedCat = await service.markAllAsRead(VALID_WORKSPACE, "security");
  assert.equal(markedCat.count, 1);
  assert.ok(mockRows[0].read_at !== null);
  assert.equal(mockRows[1].read_at, null);

  // Mark remainder as read
  const markedAll = await service.markAllAsRead(VALID_WORKSPACE);
  assert.equal(markedAll.count, 1);
  assert.ok(mockRows[1].read_at !== null);

  // Dismiss read notifications
  const dismissed = await service.dismissRead(VALID_WORKSPACE);
  assert.equal(dismissed.count, 2);
  assert.ok(mockRows[0].dismissed_at !== null);
  assert.ok(mockRows[1].dismissed_at !== null);
});
