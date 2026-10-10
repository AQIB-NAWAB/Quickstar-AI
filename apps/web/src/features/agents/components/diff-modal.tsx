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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl max-h-[85vh] rounded-16 border border-border-faint bg-white p-6 shadow-xl flex flex-col relative"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-8 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-10 bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-accent-black">Version Comparison</h3>
            <p className="text-xs text-neutral-500">
              Comparing <span className="font-semibold text-accent-black">{leftTitle}</span> with{" "}
              <span className="font-semibold text-accent-black">{rightTitle}</span>
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {loading && (
            <div className="py-12 text-center text-neutral-400">Loading differences...</div>
          )}

          {error && (
            <div className="p-3 rounded-8 bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && fieldKeys.length === 0 && (
            <div className="py-12 text-center text-neutral-500">
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
                <div key={key} className="rounded-10 border border-border-faint overflow-hidden">
                  <div className="bg-neutral-50 px-3 py-1.5 font-semibold font-mono text-[11px] text-neutral-700 border-b border-border-faint">
                    {key}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border-faint font-mono text-[11px]">
                    <div className="p-3 bg-red-50/40">
                      <div className="text-[10px] uppercase font-bold text-red-600 mb-1">
                        {leftTitle}
                      </div>
                      <pre className="whitespace-pre-wrap break-all text-neutral-700 max-h-48 overflow-y-auto">
                        {beforeStr}
                      </pre>
                    </div>
                    <div className="p-3 bg-green-50/40">
                      <div className="text-[10px] uppercase font-bold text-green-600 mb-1">
                        {rightTitle}
                      </div>
                      <pre className="whitespace-pre-wrap break-all text-neutral-700 max-h-48 overflow-y-auto">
                        {afterStr}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="mt-4 pt-3 border-t border-border-faint flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-8 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors border border-border-faint"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
