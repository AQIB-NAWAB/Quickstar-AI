"use client";

import {
AlertTriangle,
Bell,
Check,
CheckCheck,
Info,
PhoneCall,
UserCheck,
} from "lucide-react";
import { useState } from "react";
import { useNotifications } from "../context/notifications-context";
import type { NotificationType } from "../lib/types";

interface NotificationCenterProps {
  workspaceId: string;
  isPreview?: boolean;
}

export function NotificationCenter({
  isPreview = false,
}: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } =
    useNotifications();

  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = notifications.filter((n) => {
    if (filterTab === "unread" && n.readAt !== null) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    return true;
  });

  function renderTypeIcon(type: NotificationType) {
    switch (type) {
      case "ingest_failed":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "usage_threshold":
        return <Bell className="w-4 h-4 text-heat-100" />;
      case "campaign_attention":
        return <PhoneCall className="w-4 h-4 text-red-600" />;
      case "member_joined":
        return <UserCheck className="w-4 h-4 text-neutral-500" />;
      default:
        return <Info className="w-4 h-4 text-neutral-400" />;
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-accent-black">
              Notification center
            </h1>
            {unreadCount !== null && unreadCount > 0 && (
              <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded-full bg-orange-50 text-heat-100 border border-orange-200">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Notifications do not modify audit records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by notification type"
            className="text-xs bg-white border border-neutral-200 rounded-8 px-2.5 py-1.5 text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 shadow-xs"
          >
            <option value="all">All types</option>
            <option value="ingest_failed">Ingest failure</option>
            <option value="usage_threshold">Usage threshold</option>
            <option value="campaign_attention">Campaign attention</option>
            <option value="member_joined">Member joined</option>
          </select>

          {/* Filter Pills */}
          <div className="flex items-center p-0.5 bg-neutral-100 rounded-8 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1 rounded-6 transition-colors ${
                filterTab === "all"
                  ? "bg-heat-100 text-white font-semibold shadow-xs"
                  : "text-neutral-600 hover:text-accent-black"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("unread")}
              className={`px-3 py-1 rounded-6 transition-colors ${
                filterTab === "unread"
                  ? "bg-heat-100 text-white font-semibold shadow-xs"
                  : "text-neutral-600 hover:text-accent-black"
              }`}
            >
              Unread
            </button>
          </div>

          {/* Mark all as read button */}
          <button
            type="button"
            onClick={() => markAllAsRead()}
            disabled={unreadCount === 0 || unreadCount === null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-heat-100 bg-white hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed text-heat-100 text-xs font-semibold rounded-8 shadow-xs transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5 text-neutral-500" />
            <span>Mark all as read</span>
          </button>
        </div>
      </div>

      {/* Notifications Table */}
      {loading ? (
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs space-y-3">
          <div className="h-4 bg-neutral-100 rounded-4 w-1/4 animate-pulse" />
          <div className="h-12 bg-neutral-50 rounded-8 w-full animate-pulse" />
          <div className="h-12 bg-neutral-50 rounded-8 w-full animate-pulse" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-border-faint rounded-12 p-12 shadow-xs text-center space-y-2">
          <Check className="w-8 h-8 text-emerald-600 mx-auto" />
          <h2 className="text-sm font-bold text-accent-black">You&apos;re all caught up.</h2>
          <p className="text-xs text-neutral-500">
            {filterTab === "unread"
              ? "There are no unread notifications for this workspace."
              : "No notifications found matching the selected filter."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-border-faint rounded-12 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-faint bg-neutral-50/60 text-[11px] font-semibold text-neutral-500 ">
                  <th className="py-2.5 px-3 text-center w-12">Type</th>
                  <th className="py-2.5 px-4 min-w-[240px]">Notification</th>
                  <th className="py-2.5 px-4">Source</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-faint">
                {filtered.map((item) => {
                  const isUnread = item.readAt === null;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isUnread ? "bg-orange-50/20 hover:bg-orange-50/40" : "hover:bg-neutral-50/50"
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <div className="w-7 h-7 rounded-full bg-neutral-50 border border-neutral-200/80 flex items-center justify-center mx-auto">
                          {renderTypeIcon(item.type)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-accent-black">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                          {item.description}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-neutral-700 font-medium">
                          {item.source.name}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-400">
                          {item.source.id}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-neutral-500 text-[11px]">
                        {item.timeAgoLabel}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {isUnread ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-heat-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-heat-100" />
                            <span>Unread</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                            <span>Read</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isUnread ? (
                          <button
                            type="button"
                            onClick={() => markAsRead(item.id)}
                            className="px-2.5 py-1 border border-heat-100 bg-white hover:bg-orange-50 text-heat-100 rounded-6 text-xs font-semibold shadow-xs transition-colors"
                          >
                            Mark as read
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 text-neutral-400 text-xs font-medium cursor-default">
                            Read
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div className="px-4 py-3 border-t border-border-faint bg-neutral-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-neutral-500">
            <span>Bell badge reflects unread notifications for the current workspace.</span>
            {isPreview && <span>All records are illustrative sample data.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
