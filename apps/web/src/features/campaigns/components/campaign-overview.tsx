"use client";

import { BarChart2,CheckCircle2,Clock,Phone,Search,Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatDuration,formatNumber,formatPercent,formatUtcDateTime } from "../lib/format";
import type { CampaignContact,CampaignDetail } from "../lib/types";
import { CallActivityChart } from "./call-activity-chart";
import { CampaignProgress } from "./campaign-progress";
import { ContactStatusBadge } from "./campaign-status-badge";
import { ExecutionSettings } from "./execution-settings";

interface CampaignOverviewProps {
  campaign: CampaignDetail;
  contacts: CampaignContact[];
  campaignBaseUrl: string;
}

export function CampaignOverview({
  campaign,
  contacts,
  campaignBaseUrl,
}: CampaignOverviewProps) {
  const { metrics, activityBuckets } = campaign;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredPreviewContacts = contacts.filter((c) => {
    const q = searchTerm.trim().toLowerCase();
    const matchSearch =
      !q ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      c.phone.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* 5 Top Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Total contacts */}
        <div className="bg-white border border-border-faint rounded-12 p-4 shadow-xs space-y-1">
          <div className="flex items-center gap-2 text-neutral-400 text-xs">
            <Users className="w-4 h-4 shrink-0" />
            <span>Total contacts</span>
          </div>
          <div className="text-2xl font-bold text-accent-black tracking-tight">
            {formatNumber(metrics.eligibleContacts)}
          </div>
        </div>

        {/* Card 2: Completed contacts */}
        <div className="bg-white border border-border-faint rounded-12 p-4 shadow-xs space-y-1">
          <div className="flex items-center gap-2 text-neutral-400 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Completed contacts</span>
          </div>
          <div className="text-2xl font-bold text-accent-black tracking-tight">
            {formatNumber(metrics.completedContacts)}
          </div>
        </div>

        {/* Card 3: Answered */}
        <div className="bg-white border border-border-faint rounded-12 p-4 shadow-xs space-y-1">
          <div className="flex items-center gap-2 text-neutral-400 text-xs">
            <Phone className="w-4 h-4 shrink-0" />
            <span>Answered</span>
          </div>
          <div className="text-2xl font-bold text-accent-black tracking-tight">
            {formatNumber(metrics.answeredContacts)}
          </div>
        </div>

        {/* Card 4: Answer rate */}
        <div className="bg-white border border-border-faint rounded-12 p-4 shadow-xs space-y-0.5">
          <div className="flex items-center gap-2 text-neutral-400 text-xs">
            <BarChart2 className="w-4 h-4 shrink-0" />
            <span>Answer rate</span>
          </div>
          <div className="text-2xl font-bold text-accent-black tracking-tight">
            {formatPercent(metrics.answerRate, 0)}
          </div>
          <p className="text-[10px] text-neutral-400">
            {formatNumber(metrics.answeredContacts)} of {formatNumber(metrics.completedContacts)} completed
          </p>
        </div>

        {/* Card 5: Avg answered duration */}
        <div className="bg-white border border-border-faint rounded-12 p-4 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-neutral-400 text-xs">
            <Clock className="w-4 h-4 shrink-0" />
            <span>Avg answered duration</span>
          </div>
          <div className="text-2xl font-bold text-accent-black tracking-tight">
            {formatDuration(metrics.avgAnsweredDurationSeconds)}
          </div>
        </div>
      </div>

      {/* Campaign Progress Card */}
      <CampaignProgress metrics={metrics} />

      {/* Two Column Grid: Call Activity Chart (left) + Execution Settings (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 xl:col-span-7">
          <CallActivityChart buckets={activityBuckets} />
        </div>
        <div className="lg:col-span-5 xl:col-span-5">
          <ExecutionSettings campaign={campaign} />
        </div>
      </div>

      {/* Compact Contacts Card */}
      <div className="bg-white border border-border-faint rounded-12 overflow-hidden shadow-xs space-y-3 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-accent-black tracking-tight">
            Contacts
          </h3>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name or phone"
                className="pl-8 pr-3 py-1 text-xs border border-border-faint rounded-6 bg-white text-neutral-700 focus:outline-none focus:border-heat-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-border-faint rounded-6 bg-white text-neutral-700 focus:outline-none focus:border-heat-100"
            >
              <option value="all">All statuses</option>
              <option value="answered">Answered</option>
              <option value="retrying">Retrying</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="opted_out">Opted out</option>
            </select>

            <Link
              href={`${campaignBaseUrl}/contacts`}
              className="text-xs font-semibold text-heat-100 hover:underline shrink-0 ml-1"
            >
              View all
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border-t border-border-faint pt-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-faint text-neutral-400 font-medium">
                <th className="py-2 px-3 font-medium">Contact</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 px-3 font-medium">Attempts</th>
                <th className="py-2 px-3 font-medium">Last attempt (UTC)</th>
                <th className="py-2 px-3 font-medium">Outcome</th>
                <th className="py-2 px-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-faint text-neutral-700">
              {filteredPreviewContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400 italic">
                    No contacts match the filter.
                  </td>
                </tr>
              ) : (
                filteredPreviewContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-accent-black">
                          {contact.name || "Unnamed"}
                        </span>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {contact.phone}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <ContactStatusBadge status={contact.status} />
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {contact.attemptsCount}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-neutral-500 text-[11px]">
                      {contact.lastAttemptAt ? formatUtcDateTime(contact.lastAttemptAt) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600">
                      {contact.outcome || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`${campaignBaseUrl}/contacts/${encodeURIComponent(contact.id)}`}
                        className="font-medium text-heat-100 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Notes */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-neutral-400 pt-2 border-t border-border-faint">
          <span>Sample contacts shown.</span>
          <span className="italic">
            Attempts can exceed contact count because of retries.
          </span>
        </div>
      </div>
    </div>
  );
}
