import type { WorkspaceNotification } from "./types";

export const SAMPLE_NOTIFICATIONS: WorkspaceNotification[] = [
  {
    id: "notif_1",
    workspaceId: "local-preview",
    type: "ingest_failed",
    title: "Knowledge source failed",
    description: "Product guide could not be processed.",
    source: {
      name: "Product guide",
      id: "source_224",
    },
    createdAt: "2026-10-10T14:10:00.000Z",
    readAt: null,
    timeAgoLabel: "12 min ago",
  },
  {
    id: "notif_2",
    workspaceId: "local-preview",
    type: "usage_threshold",
    title: "Usage threshold reached",
    description: "Review the latest workspace usage.",
    source: {
      name: "AcmeSupport",
      id: "ws_acme",
    },
    createdAt: "2026-10-10T13:47:00.000Z",
    readAt: null,
    timeAgoLabel: "35 min ago",
  },
  {
    id: "notif_3",
    workspaceId: "local-preview",
    type: "campaign_attention",
    title: "Campaign requires attention",
    description: "Product demo follow-up encountered provider errors.",
    source: {
      name: "Product demo campaign",
      id: "camp_502",
    },
    createdAt: "2026-10-10T13:22:00.000Z",
    readAt: null,
    timeAgoLabel: "1h ago",
  },
  {
    id: "notif_4",
    workspaceId: "local-preview",
    type: "member_joined",
    title: "Member joined the workspace",
    description: "Sam Patel accepted the invitation.",
    source: {
      name: "AcmeSupport",
      id: "ws_acme",
    },
    createdAt: "2026-10-09T16:04:00.000Z",
    readAt: "2026-10-09T18:00:00.000Z",
    timeAgoLabel: "Yesterday",
  },
];
