"use client";

import { Activity, ArrowLeft, Clock, Download, Pause, Play, Square, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { CampaignDetail } from "../lib/types";
import { CampaignActionDialog } from "./campaign-action-dialog";
import { CampaignStatusBadge } from "./campaign-status-badge";

interface CampaignHeaderProps {
  campaign: CampaignDetail;
  activeTab: "overview" | "contacts" | "attempts";
  campaignBaseUrl: string;
  backUrl: string;
  isPreview?: boolean;
  onLaunch?: () => Promise<void> | void;
  onPause?: () => Promise<void> | void;
  onResume?: () => Promise<void> | void;
  onStop?: () => Promise<void> | void;
  exportCsvUrl?: string;
}

export function CampaignHeader({
  campaign,
  activeTab,
  campaignBaseUrl,
  backUrl,
  isPreview = false,
  onLaunch,
  onPause,
  onResume,
  onStop,
  exportCsvUrl,
}: CampaignHeaderProps) {
  const [dialogAction, setDialogAction] = useState<"launch" | "pause" | "resume" | "stop" | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const { name, description, status, agentName, schedule, pacing, metrics } = campaign;

  async function handleConfirmAction() {
    if (dialogAction === "launch" && onLaunch) {
      await onLaunch();
    } else if (dialogAction === "pause" && onPause) {
      await onPause();
    } else if (dialogAction === "resume" && onResume) {
      await onResume();
    } else if (dialogAction === "stop" && onStop) {
      await onStop();
    }
    if (isPreview) {
      setFeedbackNotice("Preview state changed. No calls were affected.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <div>
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-heat-100 hover:text-[#e04e10] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All campaigns</span>
        </Link>
      </div>

      {/* Title & Action Buttons Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-accent-black tracking-tight">
              {name}
            </h1>
            <CampaignStatusBadge status={status} />
            {isPreview && (
              <span className="border border-orange-200 bg-orange-50/50 text-heat-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Sample data
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-neutral-500 leading-normal">
              {description}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {(status === "draft" || status === "scheduled") && (
            <button
              type="button"
              onClick={() => setDialogAction("launch")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-6 text-xs font-semibold bg-heat-100 hover:bg-[#e04e10] text-white shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch</span>
            </button>
          )}

          {status === "running" && (
            <>
              <button
                type="button"
                onClick={() => setDialogAction("pause")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-6 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-accent-black shadow-xs transition-colors"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
              <button
                type="button"
                onClick={() => setDialogAction("stop")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-6 text-xs font-semibold border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-600 shadow-xs transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            </>
          )}

          {status === "paused" && (
            <>
              <button
                type="button"
                onClick={() => setDialogAction("resume")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-6 text-xs font-semibold border border-emerald-300 bg-emerald-50 text-emerald-700 shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={() => setDialogAction("stop")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-6 text-xs font-semibold border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-600 shadow-xs transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            </>
          )}

          {exportCsvUrl && (
            <a
              href={exportCsvUrl}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-6 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-accent-black shadow-xs transition-colors"
              title="Export results as CSV"
            >
              <Download className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </a>
          )}
        </div>
      </div>

      {/* Ephemeral Feedback notice */}
      {feedbackNotice && (
        <div className="rounded-8 border border-neutral-200 bg-neutral-100/90 px-4 py-2 text-xs text-accent-black flex items-center justify-between animate-in fade-in duration-100">
          <span>{feedbackNotice}</span>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-neutral-400 hover:text-neutral-700 font-bold ml-3"
            aria-label="Dismiss notice"
          >
            &times;
          </button>
        </div>
      )}

      {/* Metadata Strip */}
      <div className="bg-white border border-border-faint rounded-10 px-4 py-2.5 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-neutral-600 shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-400">Agent:</span>
          <span className="font-semibold text-accent-black">{agentName}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="text-neutral-400">Call window:</span>
          <span className="font-semibold text-accent-black font-mono">
            {schedule.dailyWindowFrom} &ndash; {schedule.dailyWindowTo} {schedule.timezone}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="text-neutral-400">Concurrency:</span>
          <span className="font-semibold text-accent-black font-mono">
            {metrics.activeCalls} / {pacing.maxConcurrentCalls} active
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="text-neutral-400">Pacing:</span>
          <span className="font-semibold text-accent-black font-mono">
            Up to {pacing.maxCallStartsPerMinute} starts / min
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-6 border-b border-border-faint text-xs">
        <Link
          href={campaignBaseUrl}
          className={`pb-2.5 -mb-px transition-colors ${
            activeTab === "overview"
              ? "border-b-2 border-heat-100 font-bold text-accent-black"
              : "text-neutral-500 hover:text-neutral-900 font-medium"
          }`}
        >
          Overview
        </Link>
        <Link
          href={`${campaignBaseUrl}/contacts`}
          className={`pb-2.5 -mb-px transition-colors ${
            activeTab === "contacts"
              ? "border-b-2 border-heat-100 font-bold text-accent-black"
              : "text-neutral-500 hover:text-neutral-900 font-medium"
          }`}
        >
          Contacts
        </Link>
        <Link
          href={`${campaignBaseUrl}/attempts`}
          className={`pb-2.5 -mb-px transition-colors ${
            activeTab === "attempts"
              ? "border-b-2 border-heat-100 font-bold text-accent-black"
              : "text-neutral-500 hover:text-neutral-900 font-medium"
          }`}
        >
          Call attempts
        </Link>
      </div>

      {/* Action Dialog */}
      {dialogAction && (
        <CampaignActionDialog
          open={Boolean(dialogAction)}
          actionType={dialogAction}
          campaignName={name}
          onConfirm={handleConfirmAction}
          onClose={() => setDialogAction(null)}
        />
      )}
    </div>
  );
}
