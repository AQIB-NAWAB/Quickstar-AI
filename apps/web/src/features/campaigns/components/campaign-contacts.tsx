"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatUtcDateTime } from "../lib/format";
import type { CampaignContact } from "../lib/types";
import { ContactStatusBadge } from "./campaign-status-badge";

interface CampaignContactsProps {
  contacts: CampaignContact[];
  campaignBaseUrl: string;
}

export function CampaignContacts({
  contacts,
  campaignBaseUrl,
}: CampaignContactsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredContacts = contacts.filter((c) => {
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
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name or phone"
              className="w-full pl-9 pr-3 py-1.5 border border-border-faint rounded-8 bg-white focus:outline-none focus:border-heat-100 text-neutral-700"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-border-faint rounded-8 bg-white text-neutral-700 focus:outline-none focus:border-heat-100"
          >
            <option value="all">All statuses</option>
            <option value="answered">Answered</option>
            <option value="retrying">Retrying</option>
            <option value="pending">Pending</option>
            <option value="held">Held</option>
            <option value="failed">Failed</option>
            <option value="opted_out">Opted out</option>
          </select>
        </div>

        <div className="text-[11px] text-neutral-400 font-mono">
          Showing {filteredContacts.length} contacts
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-border-faint rounded-12 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-faint bg-neutral-50/50 text-neutral-400 font-medium">
                <th className="py-2.5 px-4 font-medium">Contact</th>
                <th className="py-2.5 px-4 font-medium">Timezone</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Attempts</th>
                <th className="py-2.5 px-4 font-medium">Last attempt (UTC)</th>
                <th className="py-2.5 px-4 font-medium">Outcome</th>
                <th className="py-2.5 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-faint text-neutral-700">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400 italic">
                    No contacts found.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-accent-black">
                          {contact.name || "Unnamed"}
                        </p>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          {contact.phone}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                      {contact.timezone || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col items-start gap-1">
                        <ContactStatusBadge status={contact.isHeld ? "held" : contact.status} />
                        {contact.isHeld && contact.heldReason && (
                          <span className="text-[10px] text-amber-700 font-mono">
                            {contact.heldReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {contact.attemptsCount}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-500 text-[11px]">
                      {contact.lastAttemptAt ? formatUtcDateTime(contact.lastAttemptAt) : "—"}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {contact.outcome || "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`${campaignBaseUrl}/contacts/${encodeURIComponent(contact.id)}`}
                        className="font-medium text-heat-100 hover:underline"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="px-4 py-2.5 bg-neutral-50/40 border-t border-border-faint text-[11px] text-neutral-400 flex items-center justify-between">
          <span>Search and filters apply to loaded audience contacts.</span>
          <span className="italic">Attempts can exceed contact count because of retries.</span>
        </div>
      </div>
    </div>
  );
}
