"use client";

import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CreditCard,
  ExternalLink,
  Info,
  PhoneCall,
  Shield,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useNotifications } from "../context/notifications-context";
import type { NotificationSeverity } from "../lib/types";

interface NotificationBellProps {
  workspaceId: string;
  isPreview?: boolean;
}

export function NotificationBell({
  workspaceId,
  isPreview = false,
}: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const targetUrl = isPreview
    ? "/preview/notifications"
    : `/workspaces/${workspaceId}/notifications`;

  const countDisplay =
    unreadCount !== null && unreadCount > 0
      ? unreadCount > 99
        ? "99+"
        : String(unreadCount)
      : null;

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Recent 5 notifications for the flyout
  const recentNotifications = notifications.slice(0, 5);

  function renderSmallIcon(severity: NotificationSeverity, category: string) {
    if (category === "voice_campaigns") {
      return <PhoneCall className="w-3.5 h-3.5 text-[#B42318]" />;
    }
    if (category === "billing") {
      return <CreditCard className="w-3.5 h-3.5 text-[#B54708]" />;
    }
    if (category === "system_security") {
      return <Shield className="w-3.5 h-3.5 text-[#175CD3]" />;
    }
    switch (severity) {
      case "error":
        return <AlertCircle className="w-3.5 h-3.5 text-[#B42318]" />;
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 text-[#B54708]" />;
      case "success":
        return <Check className="w-3.5 h-3.5 text-[#027A48]" />;
      default:
        return <Info className="w-3.5 h-3.5 text-[#71717A]" />;
    }
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Bell Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={countDisplay ? `Notifications (${countDisplay} unread)` : "Notifications"}
        aria-expanded={isOpen}
        className="relative p-2 text-[#71717A] hover:text-[#18181B] transition-colors rounded-8 hover:bg-[#F8F9FB]"
      >
        <Bell className="w-4 h-4" />
        {countDisplay !== null && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FF571A] text-white text-[10px] font-bold font-mono flex items-center justify-center leading-none shadow-xs pointer-events-none">
            {countDisplay}
          </span>
        )}
      </button>

      {/* Flyout Popover matching Image 4 */}
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div
            className={`
              fixed bottom-0 inset-x-0 z-50 md:absolute md:inset-auto md:top-full md:right-0 md:bottom-auto
              w-full md:w-96 bg-white border border-[#EAECF0] md:rounded-12 rounded-t-20 shadow-xl
              flex flex-col max-h-[85vh] md:max-h-[500px] overflow-hidden text-xs
            `}
          >
            {/* Popover Header */}
            <div className="p-3.5 border-b border-[#EAECF0] flex items-center justify-between bg-[#F8F9FB]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#18181B]">Notifications</span>
                {countDisplay && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FFF4ED] text-[#FF571A] border border-[#FEDF89]">
                    {countDisplay} unread
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount !== null && unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsRead()}
                    className="text-[11px] font-semibold text-[#FF571A] hover:text-[#E0460D] transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-[#71717A] hover:text-[#18181B] p-1 rounded-4 hover:bg-neutral-200/50"
                  aria-label="Close notifications popover"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications Body */}
            <div className="overflow-y-auto divide-y divide-[#EAECF0] flex-1">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center text-[#71717A] space-y-1">
                  <Check className="w-6 h-6 text-[#027A48] mx-auto mb-1" />
                  <p className="font-semibold text-xs text-[#18181B]">All caught up</p>
                  <p className="text-[11px]">No notifications right now.</p>
                </div>
              ) : (
                recentNotifications.map((item) => {
                  const isUnread = item.readAt === null;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 space-y-1.5 transition-colors ${
                        isUnread ? "bg-[#FFF4ED]/30 hover:bg-[#FFF4ED]/50" : "hover:bg-[#F8F9FB]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-white border border-[#EAECF0] flex items-center justify-center shrink-0 shadow-xs">
                            {renderSmallIcon(item.severity, item.category)}
                          </div>
                          <span className="font-semibold text-xs text-[#18181B] truncate">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#71717A] font-mono shrink-0">
                          {item.timeAgoLabel || "Now"}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#52525B] leading-snug pl-8">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between pl-8 pt-1">
                        {item.actionUrl ? (
                          <Link
                            href={item.actionUrl}
                            onClick={() => setIsOpen(false)}
                            className="text-[11px] font-semibold text-[#FF571A] hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>{item.actionLabel || "View"}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        ) : (
                          <span />
                        )}

                        {isUnread && (
                          <button
                            type="button"
                            onClick={() => markAsRead(item.id)}
                            className="text-[10px] text-[#71717A] hover:text-[#18181B] underline"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Popover Footer */}
            <div className="p-2.5 border-t border-[#EAECF0] bg-[#F8F9FB] text-center">
              <Link
                href={targetUrl}
                onClick={() => setIsOpen(false)}
                className="text-xs font-semibold text-[#FF571A] hover:text-[#E0460D] transition-colors inline-flex items-center gap-1"
              >
                <span>View all in Notification Center</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
