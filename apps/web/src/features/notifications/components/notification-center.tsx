"use client";

import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCheck,
  CreditCard,
  ExternalLink,
  Info,
  PhoneCall,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useNotifications } from "../context/notifications-context";
import type { NotificationCategory, NotificationSeverity } from "../lib/types";

interface NotificationCenterProps {
  workspaceId: string;
  isPreview?: boolean;
}

const CATEGORY_TABS: { id: NotificationCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "voice_campaigns", label: "Voice Campaigns" },
  { id: "system_security", label: "System & Security" },
  { id: "billing", label: "Billing & Usage" },
];

export function NotificationCenter({
  isPreview = false,
}: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } =
    useNotifications();

  const [activeTab, setActiveTab] = useState<NotificationCategory>("all");

  const filtered = notifications.filter((n) => {
    if (activeTab === "unread") return n.readAt === null;
    if (activeTab !== "all") return n.category === activeTab;
    return true;
  });

  function getCategoryCount(cat: NotificationCategory) {
    if (cat === "all") return notifications.length;
    if (cat === "unread") return notifications.filter((n) => n.readAt === null).length;
    return notifications.filter((n) => n.category === cat).length;
  }

  function renderSeverityIcon(severity: NotificationSeverity, category: NotificationCategory) {
    if (category === "voice_campaigns") {
      return (
        <div className="w-8 h-8 rounded-full bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] flex items-center justify-center shrink-0">
          <PhoneCall className="w-4 h-4" />
        </div>
      );
    }
    if (category === "billing") {
      return (
        <div className="w-8 h-8 rounded-full bg-[#FFF4ED] border border-[#FEDF89] text-[#B54708] flex items-center justify-center shrink-0">
          <CreditCard className="w-4 h-4" />
        </div>
      );
    }
    if (category === "system_security") {
      return (
        <div className="w-8 h-8 rounded-full bg-[#EFF8FF] border border-[#B2DDFF] text-[#175CD3] flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4" />
        </div>
      );
    }

    switch (severity) {
      case "error":
        return (
          <div className="w-8 h-8 rounded-full bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
      case "warning":
        return (
          <div className="w-8 h-8 rounded-full bg-[#FFF4ED] border border-[#FEDF89] text-[#B54708] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case "success":
        return (
          <div className="w-8 h-8 rounded-full bg-[#E9F9EF] border border-[#A6F4C5] text-[#027A48] flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-[#F8F9FB] border border-[#EAECF0] text-[#71717A] flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header matching Image 4 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#18181B]">
              Notifications
            </h1>
            {unreadCount !== null && unreadCount > 0 && (
              <span className="text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-full bg-[#FFF4ED] text-[#FF571A] border border-[#FEDF89]">
                {unreadCount} unread
              </span>
            )}
            {isPreview && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-orange-50 text-[#FF571A] border border-orange-200">
                Sample preview
              </span>
            )}
          </div>
          <p className="text-xs text-[#71717A] mt-1">
            Stay updated on workspace activity, voice campaigns, and critical system alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => markAllAsRead()}
            disabled={unreadCount === 0 || unreadCount === null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#EAECF0] bg-white hover:bg-[#F8F9FB] disabled:opacity-40 disabled:cursor-not-allowed text-[#18181B] text-xs font-semibold rounded-8 shadow-xs transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5 text-[#71717A]" />
            <span>Mark all as read</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs matching Image 4 */}
      <div className="flex items-center gap-1.5 border-b border-[#EAECF0] overflow-x-auto pb-px">
        {CATEGORY_TABS.map((tab) => {
          const count = getCategoryCount(tab.id);
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                isActive
                  ? "border-[#FF571A] text-[#FF571A]"
                  : "border-transparent text-[#71717A] hover:text-[#18181B]"
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? "bg-[#FFF4ED] text-[#FF571A]"
                      : "bg-[#EAECF0] text-[#52525B]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="bg-white border border-[#EAECF0] rounded-12 p-8 shadow-xs space-y-3">
          <div className="h-4 bg-[#F8F9FB] rounded-4 w-1/4 animate-pulse" />
          <div className="h-16 bg-[#F8F9FB] rounded-8 w-full animate-pulse" />
          <div className="h-16 bg-[#F8F9FB] rounded-8 w-full animate-pulse" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#EAECF0] rounded-12 p-12 shadow-xs text-center space-y-2">
          <Check className="w-8 h-8 text-[#027A48] mx-auto" />
          <h2 className="text-sm font-bold text-[#18181B]">You&apos;re all caught up!</h2>
          <p className="text-xs text-[#71717A]">
            {activeTab === "unread"
              ? "There are no unread notifications for this workspace."
              : "No notifications found in this category."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#EAECF0] rounded-12 divide-y divide-[#EAECF0] overflow-hidden shadow-xs">
          {filtered.map((item) => {
            const isUnread = item.readAt === null;

            return (
              <div
                key={item.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isUnread
                    ? "bg-[#FFF4ED]/30 hover:bg-[#FFF4ED]/50"
                    : "hover:bg-[#F8F9FB]"
                }`}
              >
                {/* Left: Icon & Text */}
                <div className="flex items-start gap-3.5 min-w-0">
                  {renderSeverityIcon(item.severity, item.category)}

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-[#18181B]">
                        {item.title}
                      </span>
                      {isUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF571A] shrink-0" />
                      )}
                      <span className="text-[10px] text-[#71717A] font-mono">
                        &middot; {item.timeAgoLabel || "Recent"}
                      </span>
                    </div>

                    <p className="text-xs text-[#52525B] leading-relaxed break-words">
                      {item.description}
                    </p>

                    {item.source && (
                      <div className="text-[10px] font-mono text-[#71717A]">
                        Source: {item.source.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {item.actionUrl && (
                    <Link
                      href={item.actionUrl}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-[#F8F9FB] border border-[#EAECF0] text-[#18181B] rounded-8 text-xs font-semibold shadow-xs transition-colors"
                    >
                      <span>{item.actionLabel || "View"}</span>
                      <ExternalLink className="w-3 h-3 text-[#71717A]" />
                    </Link>
                  )}

                  {isUnread ? (
                    <button
                      type="button"
                      onClick={() => markAsRead(item.id)}
                      className="px-2.5 py-1 text-xs font-medium text-[#71717A] hover:text-[#18181B] hover:bg-white rounded-6 transition-colors border border-transparent hover:border-[#EAECF0]"
                    >
                      Mark read
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#71717A] font-medium px-2 py-1">
                      Read
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
