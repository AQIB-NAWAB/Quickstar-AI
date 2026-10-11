"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useNotifications } from "../context/notifications-context";

interface NotificationBellProps {
  workspaceId: string;
  isPreview?: boolean;
}

export function NotificationBell({
  workspaceId,
  isPreview = false,
}: NotificationBellProps) {
  const { unreadCount } = useNotifications();
  const targetUrl = isPreview
    ? "/preview/notifications"
    : `/workspaces/${workspaceId}/notifications`;

  const countDisplay =
    unreadCount !== null && unreadCount > 0
      ? unreadCount > 99
        ? "99+"
        : String(unreadCount)
      : null;

  const accessibleLabel =
    unreadCount !== null && unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : "Notifications";

  return (
    <Link
      href={targetUrl}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className="relative p-2 text-neutral-500 hover:text-accent-black transition-colors rounded-8 hover:bg-neutral-100"
    >
      <Bell className="w-4 h-4" />
      {countDisplay !== null && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-heat-100 text-white text-[10px] font-bold font-mono flex items-center justify-center leading-none shadow-xs pointer-events-none">
          {countDisplay}
        </span>
      )}
    </Link>
  );
}
