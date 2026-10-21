"use client";

import { Pause,Play,Square } from "lucide-react";
import { useState } from "react";

interface CampaignActionDialogProps {
  open: boolean;
  actionType: "pause" | "resume" | "stop" | "launch";
  campaignName: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export function CampaignActionDialog({
  open,
  actionType,
  campaignName,
  onConfirm,
  onClose,
}: CampaignActionDialogProps) {
  const [stopConfirmInput, setStopConfirmInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const isStop = actionType === "stop";
  const isResume = actionType === "resume";
  const isLaunch = actionType === "launch";

  const canConfirm = !isStop || stopConfirmInput.trim() === campaignName.trim();

  async function handleExecute() {
    if (!canConfirm) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  let title = "Pause campaign?";
  let desc = "Pausing this campaign prevents new calls from starting. Active calls will continue until completed.";
  let Icon = Pause;
  let iconBg = "bg-amber-100 text-amber-700";
  let btnText = "Pause campaign";
  let btnClass = "bg-amber-600 hover:bg-amber-700 text-white";

  if (isLaunch) {
    title = "Launch campaign?";
    desc = "Launching will start scheduling and dialing contacts according to your calling window, weekdays, and pacing limits.";
    Icon = Play;
    iconBg = "bg-orange-100 text-heat-100";
    btnText = "Launch campaign";
    btnClass = "bg-heat-100 hover:bg-[#e04e10] text-white";
  } else if (isResume) {
    title = "Resume campaign?";
    desc = "Resuming will start dialing queued contacts according to your configured concurrency and pacing limits.";
    Icon = Play;
    iconBg = "bg-emerald-100 text-emerald-700";
    btnText = "Resume campaign";
    btnClass = "bg-emerald-600 hover:bg-emerald-700 text-white";
  } else if (isStop) {
    title = "Stop campaign?";
    desc = "Stopping permanently terminates remaining queued contacts. This action cannot be reversed.";
    Icon = Square;
    iconBg = "bg-red-100 text-red-600";
    btnText = "Stop campaign";
    btnClass = "bg-red-600 hover:bg-red-700 text-white";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-white rounded-12 border border-border-faint shadow-xl p-5 space-y-4 animate-in fade-in-50 zoom-in-95 duration-100">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-accent-black tracking-tight">{title}</h3>
            <p className="text-xs text-neutral-500 leading-normal">{desc}</p>
          </div>
        </div>

        {isStop && (
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] text-neutral-600 block">
              Type <strong className="text-accent-black font-semibold">{campaignName}</strong> to confirm:
            </label>
            <input
              type="text"
              value={stopConfirmInput}
              onChange={(e) => setStopConfirmInput(e.target.value)}
              placeholder={campaignName}
              className="w-full px-2.5 py-1.5 text-xs border border-border-faint rounded-6 focus:outline-none focus:border-red-500 font-mono"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-faint">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 rounded-6 text-xs font-semibold text-neutral-600 hover:text-accent-black hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={!canConfirm || isSubmitting}
            className={`px-4 py-1.5 rounded-6 text-xs font-semibold transition-colors disabled:opacity-50 ${btnClass}`}
          >
            {isSubmitting ? "Updating..." : btnText}
          </button>
        </div>
      </div>
    </div>
  );
}
