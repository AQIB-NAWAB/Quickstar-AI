"use client";

import { ArrowLeft,Check,Copy,X } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"metadata" | "changes">("metadata");
  const [copied, setCopied] = useState(false);

  const metadataJson = JSON.stringify(entry.metadata, null, 2);

  function handleCopy() {
    navigator.clipboard.writeText(metadataJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isFailedAction = entry.action.toLowerCase().includes("failed") || entry.action.toLowerCase().includes("error");

  return (
    <div className="bg-white border border-border-faint rounded-12 p-5 shadow-xs space-y-4 text-xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border-faint">
        <div>
          {isStandalone && backUrl && (
            <Link
              href={backUrl}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-accent-black mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Audit log
            </Link>
          )}
          <h2 className="text-sm font-bold text-accent-black">Audit entry</h2>
          <p className="font-mono text-neutral-400 text-[11px] mt-0.5">{entry.id}</p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit details"
            className="text-neutral-400 hover:text-accent-black p-1 transition-colors rounded-4 hover:bg-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Metadata Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Action</span>
          <span
            className={`font-mono px-2 py-0.5 rounded text-[11px] font-medium ${
              isFailedAction
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-orange-50 text-heat-100 border border-orange-200"
            }`}
          >
            {entry.action}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Actor</span>
          <span className="font-medium text-accent-black text-right">
            {entry.actor.name}{" "}
            {entry.actor.email && (
              <span className="text-neutral-400 font-normal">({entry.actor.email})</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Resource</span>
          <span className="text-accent-black text-right">
            <span className="font-medium">{entry.resource.name}</span>{" "}
            <span className="font-mono text-neutral-400">({entry.resource.id})</span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Timestamp</span>
          <span className="font-mono text-neutral-700">
            {formatAuditUtcLong(entry.occurredAt)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Request ID</span>
          <span className="font-mono text-neutral-600">
            {entry.requestId || "—"}
          </span>
        </div>
      </div>

      {/* Change summary side-by-side if present */}
      {entry.changes && (
        <div className="space-y-2 pt-2 border-t border-border-faint">
          <h3 className="text-[11px] font-bold text-accent-black ">
            Change summary
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
            {/* Before */}
            <div className="bg-neutral-50 p-2.5 rounded-8 border border-neutral-200/80 space-y-1">
              <span className="text-[10px] text-neutral-400 font-semibold block uppercase">
                Before
              </span>
              <pre className="text-neutral-600 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(entry.changes.before || {}, null, 2)}
              </pre>
            </div>

            {/* After */}
            <div className="bg-neutral-50 p-2.5 rounded-8 border border-neutral-200/80 space-y-1">
              <span className="text-[10px] text-neutral-400 font-semibold block uppercase">
                After
              </span>
              <pre className="text-neutral-600 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(entry.changes.after || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tabs: Metadata | Changes */}
      <div className="pt-2 border-t border-border-faint space-y-2">
        <div className="flex items-center justify-between border-b border-border-faint">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("metadata")}
              className={`pb-1.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "metadata"
                  ? "border-heat-100 text-heat-100"
                  : "border-transparent text-neutral-500 hover:text-accent-black"
              }`}
            >
              Metadata
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("changes")}
              className={`pb-1.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "changes"
                  ? "border-heat-100 text-heat-100"
                  : "border-transparent text-neutral-500 hover:text-accent-black"
              }`}
            >
              Changes
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-heat-100 transition-colors pb-1"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {activeTab === "metadata" ? (
          <div className="space-y-1.5">
            <pre className="p-3 bg-neutral-50 border border-neutral-200 rounded-8 font-mono text-[11px] text-neutral-700 overflow-x-auto max-h-48 leading-relaxed">
              {metadataJson}
            </pre>
            <p className="text-[10px] text-neutral-400">Sensitive values are redacted.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {entry.changes ? (
              <pre className="p-3 bg-neutral-50 border border-neutral-200 rounded-8 font-mono text-[11px] text-neutral-700 overflow-x-auto max-h-48 leading-relaxed">
                {JSON.stringify(entry.changes, null, 2)}
              </pre>
            ) : (
              <div className="p-4 text-center text-neutral-400 bg-neutral-50 rounded-8">
                No change details were recorded for this action.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
