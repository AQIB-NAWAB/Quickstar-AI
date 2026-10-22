"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Globe,
  Monitor,
  Shield,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatAuditUtcLong } from "../lib/format";
import type { AuditEntry } from "../lib/types";

interface AuditEntryDetailProps {
  entry: AuditEntry;
  onClose?: () => void;
  isStandalone?: boolean;
  backUrl?: string;
}

export function AuditEntryDetail({
  entry,
  onClose,
  isStandalone = false,
  backUrl,
}: AuditEntryDetailProps) {
  const [activeTab, setActiveTab] = useState<"changes" | "metadata">("changes");
  const [copiedRequestId, setCopiedRequestId] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const metadataJson = JSON.stringify(entry.metadata || {}, null, 2);

  function copyRequestId() {
    if (!entry.requestId) return;
    navigator.clipboard.writeText(entry.requestId);
    setCopiedRequestId(true);
    setTimeout(() => setCopiedRequestId(false), 2000);
  }

  function copyJson() {
    const payload = JSON.stringify(
      {
        id: entry.id,
        action: entry.action,
        actor: entry.actor,
        resource: entry.resource,
        occurredAt: entry.occurredAt,
        requestId: entry.requestId,
        originIp: entry.originIp,
        changes: entry.changes,
        metadata: entry.metadata,
      },
      null,
      2,
    );
    navigator.clipboard.writeText(payload);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  }

  const isFailedAction =
    entry.action.toLowerCase().includes("failed") ||
    entry.action.toLowerCase().includes("error") ||
    entry.action.toLowerCase().includes("revoked") ||
    entry.action.toLowerCase().includes("deleted");

  const isCreateAction =
    entry.action.toLowerCase().includes("created") ||
    entry.action.toLowerCase().includes("connected") ||
    entry.action.toLowerCase().includes("added");

  const actionBadgeColor = isFailedAction
    ? "bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]"
    : isCreateAction
      ? "bg-[#E9F9EF] text-[#027A48] border-[#A6F4C5]"
      : "bg-[#FFF4ED] text-[#B54708] border-[#FEDF89]";

  const beforeJson = entry.changes?.before
    ? JSON.stringify(entry.changes.before, null, 2)
    : null;
  const afterJson = entry.changes?.after
    ? JSON.stringify(entry.changes.after, null, 2)
    : null;

  return (
    <div className="bg-white border border-[#EAECF0] rounded-12 p-5 shadow-xs space-y-5 text-xs text-[#18181B] max-h-[calc(100vh-140px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#EAECF0]">
        <div>
          {isStandalone && backUrl && (
            <Link
              href={backUrl}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#71717A] hover:text-[#18181B] mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Audit log
            </Link>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-[#18181B]">Audit Entry Details</h2>
            <span
              className={`font-mono px-2 py-0.5 rounded text-[11px] font-semibold border ${actionBadgeColor}`}
            >
              {entry.action}
            </span>
          </div>
          <p className="font-mono text-[#71717A] text-[11px] mt-1">
            {formatAuditUtcLong(entry.occurredAt)} &middot; {entry.id}
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit details"
            className="text-[#71717A] hover:text-[#18181B] p-1.5 transition-colors rounded-6 hover:bg-[#F8F9FB]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Redaction Notice Alert */}
      <div className="flex items-start gap-2.5 p-3 rounded-8 bg-[#FFF4ED] border border-[#FEDF89] text-[#B54708] text-[11px] leading-relaxed">
        <AlertTriangle className="w-4 h-4 text-[#FF571A] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#18181B]">Redaction Policy Active:</span> Sensitive
          credentials, secret tokens, and authentication cookies are automatically hashed or redacted
          prior to permanent append-only audit persistence.
        </div>
      </div>

      {/* Actor & Origin Card */}
      <div className="bg-[#F8F9FB] border border-[#EAECF0] rounded-10 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#18181B]" />
            Actor &amp; Origin
          </span>
          <span className="px-2 py-0.5 rounded bg-white border border-[#EAECF0] text-[#18181B] capitalize font-medium text-[10px]">
            {entry.actor.role || "Member"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-[#71717A] block">User / Actor</span>
            <span className="font-medium text-[#18181B]">{entry.actor.name}</span>
            {entry.actor.email && (
              <span className="text-[#71717A] text-[10px] block">{entry.actor.email}</span>
            )}
          </div>
          <div>
            <span className="text-[#71717A] block">Actor ID</span>
            <span className="font-mono text-[#52525B] text-[10px]">{entry.actor.id}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-[#EAECF0] grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-[#71717A] flex items-center gap-1">
              <Globe className="w-3 h-3" /> Origin IP &amp; Geo
            </span>
            <span className="font-mono font-medium text-[#18181B]">
              {entry.originIp || "192.0.2.1"}
            </span>
            <span className="text-[#71717A] text-[10px] block">
              {entry.city ? `${entry.city}, ` : ""}
              {entry.countryCode || "US (United States)"}
            </span>
          </div>
          <div>
            <span className="text-[#71717A] flex items-center gap-1">
              <Monitor className="w-3 h-3" /> Client Info
            </span>
            <span className="font-mono text-[#52525B] text-[10px] truncate block" title={entry.userAgent || "Mozilla/5.0 (Client Web Browser)"}>
              {entry.userAgent || "Chrome 124 / macOS"}
            </span>
          </div>
        </div>
      </div>

      {/* Target Resource Card */}
      <div className="bg-[#F8F9FB] border border-[#EAECF0] rounded-10 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#18181B]" />
            Target Resource
          </span>
          <span className="font-mono text-[10px] text-[#71717A] bg-white px-2 py-0.5 rounded border border-[#EAECF0]">
            {entry.resource.type}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-[#71717A] block">Resource Identifier</span>
            <span className="font-mono font-medium text-[#18181B] break-all">
              {entry.resource.id}
            </span>
          </div>
          <div>
            <span className="text-[#71717A] block">Trace Request ID</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-[#52525B] text-[10px] truncate">
                {entry.requestId || "—"}
              </span>
              {entry.requestId && (
                <button
                  type="button"
                  onClick={copyRequestId}
                  className="p-1 hover:bg-white rounded border border-transparent hover:border-[#EAECF0] text-[#71717A]"
                  title="Copy Request ID"
                >
                  {copiedRequestId ? (
                    <Check className="w-3 h-3 text-[#027A48]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Changes & Payload Tabs */}
      <div className="pt-2 border-t border-[#EAECF0] space-y-3">
        <div className="flex items-center justify-between border-b border-[#EAECF0]">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("changes")}
              className={`pb-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "changes"
                  ? "border-[#FF571A] text-[#FF571A]"
                  : "border-transparent text-[#71717A] hover:text-[#18181B]"
              }`}
            >
              Changes Diff
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("metadata")}
              className={`pb-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "metadata"
                  ? "border-[#FF571A] text-[#FF571A]"
                  : "border-transparent text-[#71717A] hover:text-[#18181B]"
              }`}
            >
              Metadata &amp; Raw JSON
            </button>
          </div>

          <button
            type="button"
            onClick={copyJson}
            className="inline-flex items-center gap-1 text-[11px] text-[#71717A] hover:text-[#FF571A] transition-colors pb-1"
          >
            {copiedJson ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#027A48]" />
                <span className="text-[#027A48] font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>

        {activeTab === "changes" ? (
          <div>
            {entry.changes && (beforeJson || afterJson) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                {/* Before Column */}
                <div className="bg-[#FEF3F2] border border-[#FECDCA] rounded-8 p-3 space-y-1.5 overflow-hidden">
                  <div className="flex items-center justify-between text-[#B42318] font-semibold text-[10px] uppercase">
                    <span>Before (Previous State)</span>
                    <span className="w-2 h-2 rounded-full bg-[#B42318]" />
                  </div>
                  <pre className="text-[#912018] whitespace-pre-wrap overflow-x-auto max-h-60 leading-relaxed font-mono">
                    {beforeJson || "null"}
                  </pre>
                </div>

                {/* After Column */}
                <div className="bg-[#E9F9EF] border border-[#A6F4C5] rounded-8 p-3 space-y-1.5 overflow-hidden">
                  <div className="flex items-center justify-between text-[#027A48] font-semibold text-[10px] uppercase">
                    <span>After (Updated State)</span>
                    <span className="w-2 h-2 rounded-full bg-[#027A48]" />
                  </div>
                  <pre className="text-[#05603A] whitespace-pre-wrap overflow-x-auto max-h-60 leading-relaxed font-mono">
                    {afterJson || "null"}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-[#71717A] bg-[#F8F9FB] rounded-8 border border-[#EAECF0]">
                No state mutation diff was recorded for this read or action event.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <pre className="p-3 bg-[#F8F9FB] border border-[#EAECF0] rounded-8 font-mono text-[11px] text-[#18181B] overflow-x-auto max-h-64 leading-relaxed">
              {metadataJson}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
