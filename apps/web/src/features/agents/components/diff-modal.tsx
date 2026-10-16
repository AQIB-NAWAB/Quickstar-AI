"use client";

import { useEffect, useState } from "react";
import { GitCompare, X } from "lucide-react";
import { diffVersions } from "../lib/client";
import type { AgentVersionDiff } from "../lib/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  agentId: string;
  leftId: string;
  rightId: string;
  leftTitle: string;
  rightTitle: string;
};

export function DiffModal({
  isOpen,
  onClose,
  workspaceId,
  agentId,
  leftId,
  rightId,
  leftTitle,
  rightTitle,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<AgentVersionDiff | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !leftId || !rightId) return;
    let active = true;
    setLoading(true);
    setError(null);

    diffVersions(workspaceId, agentId, leftId, rightId).then((res) => {
      if (!active) return;
      setLoading(false);
      if (res.error) {
        setError(res.error.message);
      } else {
        setDiff(res.diff ?? null);
      }
    });

    return () => {
      active = false;
    };
  }, [isOpen, workspaceId, agentId, leftId, rightId]);

  if (!isOpen) return null;

  const fieldKeys = diff?.fields ? Object.keys(diff.fields) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="diff-modal-title"
        className="w-full max-w-2xl max-h-[85vh] rounded-[12px] border border-[#E1E5EA] bg-white p-6 shadow-xl flex flex-col relative"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-[6px] text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FA] transition-colors"
          aria-label="Close comparison"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-[8px] bg-[#FFF3ED] text-[#F15A24] flex items-center justify-center shrink-0">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h3 id="diff-modal-title" className="text-[17px] font-semibold text-[#202125]">
              Version Comparison
            </h3>
            <p className="text-[13px] text-[#667085]">
              Comparing <span className="font-semibold text-[#202125]">{leftTitle}</span> with{" "}
              <span className="font-semibold text-[#202125]">{rightTitle}</span>
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-[13px]">
          {loading && (
            <div className="py-12 text-center text-[#667085]">Loading differences...</div>
          )}

          {error && (
            <div className="p-3 rounded-[6px] bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && fieldKeys.length === 0 && (
            <div className="py-12 text-center text-[#667085]">
              No differences found between these two releases.
            </div>
          )}

          {!loading &&
            !error &&
            fieldKeys.map((key) => {
              const item = diff!.fields[key];
              const beforeStr =
                typeof item.before === "object"
                  ? JSON.stringify(item.before, null, 2)
                  : String(item.before ?? "None");
              const afterStr =
                typeof item.after === "object"
                  ? JSON.stringify(item.after, null, 2)
                  : String(item.after ?? "None");

              return (
                <div key={key} className="rounded-[8px] border border-[#E1E5EA] overflow-hidden">
                  <div className="bg-[#F8F9FA] px-3.5 py-2 font-semibold font-mono text-[12px] text-[#202125] border-b border-[#E1E5EA]">
                    {key}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E1E5EA] font-mono text-[12px]">
                    <div className="p-3 bg-red-50/40">
                      <div className="text-[11px] uppercase font-bold text-red-700 mb-1">
                        {leftTitle}
                      </div>
                      <pre className="whitespace-pre-wrap break-all text-[#202125] max-h-48 overflow-y-auto font-mono leading-relaxed">
                        {beforeStr}
                      </pre>
                    </div>
                    <div className="p-3 bg-green-50/40">
                      <div className="text-[11px] uppercase font-bold text-[#15803D] mb-1">
                        {rightTitle}
                      </div>
                      <pre className="whitespace-pre-wrap break-all text-[#202125] max-h-48 overflow-y-auto font-mono leading-relaxed">
                        {afterStr}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="mt-4 pt-3 border-t border-[#EDF0F2] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[6px] text-[13px] font-medium text-[#202125] bg-white border border-[#E1E5EA] hover:bg-[#F8F9FA] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
