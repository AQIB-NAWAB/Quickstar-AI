"use client";

import { useState } from "react";
import { CheckCircle2, Clock, GitCompare, RotateCcw, AlertCircle, RefreshCw } from "lucide-react";
import type { Agent, AgentVersion } from "../lib/types";
import { RollbackModal } from "./rollback-modal";

type Props = {
  agent: Agent;
  versions: AgentVersion[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onRollback: (versionId: string) => Promise<void>;
  onOpenDiff: (leftId: string, rightId: string, leftTitle: string, rightTitle: string) => void;
};

export function ReleasesTab({
  agent,
  versions,
  loading,
  error,
  onRefresh,
  onRollback,
  onOpenDiff,
}: Props) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<AgentVersion | null>(null);

  // Default selection: currently live release or first release in list
  const activeSelectedId =
    (versions.some((version) => version.id === selectedVersionId) ? selectedVersionId : null) ||
    (agent.production_version_id
      ? versions.find((v) => v.id === agent.production_version_id)?.id
      : versions[0]?.id) ||
    versions[0]?.id ||
    null;

  const selectedVersion = versions.find((v) => v.id === activeSelectedId) || null;
  const isSelectedLive = selectedVersion ? selectedVersion.id === agent.production_version_id : false;

  function handleCompareClick() {
    if (versions.length < 2) return;
    // Default compare: selected vs live, or live vs previous
    const liveVersion = versions.find((v) => v.id === agent.production_version_id) || versions[0];
    const otherVersion =
      selectedVersion && selectedVersion.id !== liveVersion?.id
        ? selectedVersion
        : versions.find((v) => v.id !== liveVersion?.id) || versions[1];

    if (!liveVersion || !otherVersion) return;

    onOpenDiff(
      otherVersion.id,
      liveVersion.id,
      `Release #${otherVersion.release_number}`,
      `Release #${liveVersion.release_number} (Live)`,
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[24px] font-semibold text-[#202125]">Releases & rollback</h2>
        <p className="text-[15px] text-[#667085] mt-1">
          Review published versions and choose what runs live.
        </p>
      </div>

      {loading && (
        <div className="py-16 text-center text-[#667085] flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-[#F15A24]" />
          <span className="text-[15px]">Loading release history...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-[8px] bg-red-50 border border-red-200 text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[14px]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-[6px] bg-white border border-red-200 text-red-700 text-[13px] font-medium hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && versions.length === 0 && (
        <div className="rounded-[8px] border border-[#E1E5EA] bg-white p-12 text-center">
          <div className="w-12 h-12 rounded-[8px] bg-[#F8F9FA] border border-[#E1E5EA] text-[#667085] mx-auto flex items-center justify-center mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-[18px] font-semibold text-[#202125]">No releases published yet</h3>
          <p className="text-[14px] text-[#667085] mt-1 max-w-md mx-auto">
            Publishing creates an immutable release from your current draft. You can inspect differences
            and roll back to any previous release at any time.
          </p>
        </div>
      )}

      {!loading && !error && versions.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-6 items-start">
          {/* Left: Release History Table (approx 60%) */}
          <div className="min-w-0 xl:min-h-[500px] rounded-[8px] border border-[#E1E5EA] bg-white overflow-hidden shadow-sm">
            <div className="p-5 flex items-center justify-between">
              <div>
                <h3 className="text-[22px] font-semibold text-[#202125]">
                  Release history ({versions.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCompareClick}
                disabled={versions.length < 2}
                title={
                  versions.length < 2
                    ? "Publish a second release to compare versions or roll back"
                    : "Compare releases"
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[13px] font-medium border border-[#E1E5EA] bg-white text-[#202125] hover:bg-[#F8F9FA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <GitCompare className="w-3.5 h-3.5 text-[#667085]" />
                Compare
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-[#EDF0F2] text-[#667085] font-medium text-[13px] bg-[#F8F9FA]">
                    <th className="py-2.5 px-4 font-normal">Release</th>
                    <th className="py-2.5 px-4 font-normal">Published</th>
                    <th className="py-2.5 px-4 font-normal">Model</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF0F2]">
                  {versions.map((ver) => {
                    const isLive = ver.id === agent.production_version_id;
                    const isSelected = ver.id === activeSelectedId;

                    return (
                      <tr
                        key={ver.id}
                        tabIndex={0}
                        aria-selected={isSelected}
                        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedVersionId(ver.id); } }}
                        onClick={() => setSelectedVersionId(ver.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#F2F3F4] text-[#202125] border-l-2 border-l-[#F15A24]"
                            : "hover:bg-[#F8F9FA] text-[#202125]"
                        }`}
                      >
                        <td className="py-5 px-4">
                          <div className="flex flex-col items-start gap-2">
                            <span className="font-semibold text-[#202125]">
                              Release #{ver.release_number}
                            </span>
                            {isLive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[13px] font-medium text-[#15803D]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                                Live
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[12px] text-[#667085] bg-[#F2F3F4]">
                                Previous
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-5 px-4 text-[#667085] whitespace-nowrap">
                          {new Date(ver.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-5 px-4 text-[#667085] font-mono text-[13px] truncate max-w-[140px]">
                          {String(ver.snapshot?.model_settings?.model_id || ver.snapshot?.model_settings?.model || "Not configured")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#F8F9FA] border-t border-[#EDF0F2] text-[13px] text-[#667085] leading-relaxed">
              <span className="font-medium text-[#202125]">How releases work:</span> Publishing
              freezes an immutable release snapshot. You can roll back to any previous release at any
              time.
            </div>
          </div>

          {/* Right: Selected Release Inspector (approx 40%) */}
          <div className="min-w-0 xl:min-h-[500px] rounded-[8px] border border-[#E1E5EA] bg-white p-5 shadow-sm space-y-4">
            {selectedVersion ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-[#EDF0F2]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[18px] font-semibold text-[#202125]">
                        Release #{selectedVersion.release_number}
                      </h3>
                      {isSelectedLive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[13px] font-medium text-[#15803D]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                          Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] text-[#667085] bg-[#F2F3F4]">
                          Previous
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#667085] mt-0.5">
                      Published{" "}
                      {new Date(selectedVersion.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* System Instructions snapshot */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[#667085]">
                    System instructions
                  </label>
                  <div className="py-2 text-[15px] text-[#202125] max-h-48 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedVersion.snapshot?.instructions || "No instructions in this release snapshot."}
                  </div>
                </div>

                {/* Model snapshot */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[#667085]">Model</label>
                  <div className="py-2 text-[15px] text-[#202125] font-mono">
                    {String(selectedVersion.snapshot?.model_settings?.model_id || selectedVersion.snapshot?.model_settings?.model || "Not configured")}
                  </div>
                </div>

                <div className="pt-2 text-[13px] text-[#7A808A]">
                  Published settings are read-only.
                </div>

                {/* Rollback / Status action */}
                <div className="pt-3 border-t border-[#EDF0F2]">
                  {isSelectedLive ? (
                    <div className="text-[14px] text-[#15803D] font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                      This release is currently serving customers.
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRollbackTarget(selectedVersion)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[6px] text-[14px] font-medium text-[#202125] bg-white border border-[#E1E5EA] hover:bg-[#F8F9FA] transition-colors shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#F15A24]" />
                      Restore this release
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-[#667085] text-[14px]">
                Select a release to inspect its snapshot details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rollback confirmation modal */}
      <RollbackModal
        isOpen={Boolean(rollbackTarget)}
        onClose={() => setRollbackTarget(null)}
        onConfirm={async () => {
          if (rollbackTarget) {
            await onRollback(rollbackTarget.id);
          }
        }}
        version={rollbackTarget}
        agentName={agent.name}
      />
    </div>
  );
}
