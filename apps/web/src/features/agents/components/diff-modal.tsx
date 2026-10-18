"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  GitCompare,
  Layers,
  Minus,
  Plus,
  Sliders,
  Volume2,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { diffVersions } from "../lib/client";
import type { AgentToolDefinition, AgentVersionDiff } from "../lib/types";

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

type ToolDiffAnalysis = {
  added: AgentToolDefinition[];
  removed: AgentToolDefinition[];
  modified: Array<{
    name: string;
    before: AgentToolDefinition;
    after: AgentToolDefinition;
  }>;
  unchanged: AgentToolDefinition[];
};

function analyzeToolDiff(beforeTools: unknown, afterTools: unknown): ToolDiffAnalysis {
  const beforeList: AgentToolDefinition[] = Array.isArray(beforeTools) ? beforeTools : [];
  const afterList: AgentToolDefinition[] = Array.isArray(afterTools) ? afterTools : [];

  const beforeMap = new Map<string, AgentToolDefinition>(
    beforeList.map((t) => [t.name, t]),
  );
  const afterMap = new Map<string, AgentToolDefinition>(
    afterList.map((t) => [t.name, t]),
  );

  const added: AgentToolDefinition[] = [];
  const removed: AgentToolDefinition[] = [];
  const modified: Array<{ name: string; before: AgentToolDefinition; after: AgentToolDefinition }> = [];
  const unchanged: AgentToolDefinition[] = [];

  for (const [name, afterTool] of afterMap.entries()) {
    const beforeTool = beforeMap.get(name);
    if (!beforeTool) {
      added.push(afterTool);
    } else if (JSON.stringify(beforeTool) !== JSON.stringify(afterTool)) {
      modified.push({ name, before: beforeTool, after: afterTool });
    } else {
      unchanged.push(afterTool);
    }
  }

  for (const [name, beforeTool] of beforeMap.entries()) {
    if (!afterMap.has(name)) {
      removed.push(beforeTool);
    }
  }

  return { added, removed, modified, unchanged };
}

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
  const [activeTab, setActiveTab] = useState<string>("all");

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

  const fieldKeys = useMemo(() => (diff?.fields ? Object.keys(diff.fields) : []), [diff]);

  const visibleKeys = useMemo(() => {
    if (activeTab === "all") return fieldKeys;
    if (activeTab === "instructions") return fieldKeys.filter((k) => k === "instructions");
    if (activeTab === "model") return fieldKeys.filter((k) => k === "model_settings");
    if (activeTab === "tools") return fieldKeys.filter((k) => k === "tools");
    return fieldKeys.filter((k) => !["instructions", "model_settings", "tools"].includes(k));
  }, [fieldKeys, activeTab]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diff-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#101828]/45 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] rounded-[14px] border border-[#DCE1E8] bg-white p-5 sm:p-6 shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-[6px] text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FB] transition-colors"
          aria-label="Close comparison"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-[10px] bg-[#FFF6F2] text-[#FF571A] flex items-center justify-center shrink-0 border border-[#FFD9CC]">
            <GitCompare className="w-5 h-5" />
          </div>
          <div className="min-w-0 pr-8">
            <h3 id="diff-modal-title" className="text-[17px] font-semibold text-[#202125]">
              Release Comparison & Diagnostics
            </h3>
            <p className="text-[13px] text-[#667085] truncate">
              Comparing <span className="font-semibold text-[#202125]">{leftTitle}</span> (before) with{" "}
              <span className="font-semibold text-[#202125]">{rightTitle}</span> (after)
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        {!loading && !error && fieldKeys.length > 0 && (
          <div className="flex items-center gap-1.5 border-b border-[#EDF0F2] pb-3 mb-4 overflow-x-auto text-[13px]">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-[6px] font-medium transition-colors shrink-0 ${
                activeTab === "all"
                  ? "bg-[#202125] text-white"
                  : "bg-white text-[#475467] hover:bg-[#F8F9FB] hover:text-[#202125]"
              }`}
            >
              All Changes ({fieldKeys.length})
            </button>
            {fieldKeys.includes("instructions") && (
              <button
                type="button"
                onClick={() => setActiveTab("instructions")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] font-medium transition-colors shrink-0 ${
                  activeTab === "instructions"
                    ? "bg-[#202125] text-white"
                    : "bg-white text-[#475467] hover:bg-[#F8F9FB] hover:text-[#202125]"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Instructions
              </button>
            )}
            {fieldKeys.includes("model_settings") && (
              <button
                type="button"
                onClick={() => setActiveTab("model")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] font-medium transition-colors shrink-0 ${
                  activeTab === "model"
                    ? "bg-[#202125] text-white"
                    : "bg-white text-[#475467] hover:bg-[#F8F9FB] hover:text-[#202125]"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Model Settings
              </button>
            )}
            {fieldKeys.includes("tools") && (
              <button
                type="button"
                onClick={() => setActiveTab("tools")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] font-medium transition-colors shrink-0 ${
                  activeTab === "tools"
                    ? "bg-[#202125] text-white"
                    : "bg-white text-[#475467] hover:bg-[#F8F9FB] hover:text-[#202125]"
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Attached Tools
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-[13px]">
          {loading && (
            <div className="py-16 text-center text-[#667085] flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-[#FF571A] border-t-transparent rounded-full animate-spin" />
              <span>Analyzing version diff...</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-[8px] bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && fieldKeys.length === 0 && (
            <div className="py-16 text-center text-[#667085]">
              <div className="w-10 h-10 rounded-full bg-[#E9F9EF] text-[#15803D] flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-[#202125]">Releases are identical</h4>
              <p className="text-[13px] text-[#667085] mt-1">
                No differences found between these two release snapshots.
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            visibleKeys.map((key) => {
              const item = diff!.fields[key];

              // Specialized Renderer: Instructions Diff
              if (key === "instructions") {
                const beforeText = String(item.before ?? "");
                const afterText = String(item.after ?? "");
                const charDelta = afterText.length - beforeText.length;
                const beforeLines = beforeText.split("\n");
                const afterLines = afterText.split("\n");

                return (
                  <div key={key} className="rounded-[10px] border border-[#DCE1E8] overflow-hidden shadow-xs">
                    <div className="bg-[#FAFBFD] px-4 py-2.5 flex items-center justify-between border-b border-[#DCE1E8]">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#FF571A]" />
                        <span className="font-semibold text-[#202125]">System Instructions</span>
                      </div>
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="text-[#667085]">
                          {beforeLines.length} lines → {afterLines.length} lines
                        </span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-[4px] text-[11px] ${
                            charDelta > 0
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : charDelta < 0
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {charDelta > 0 ? `+${charDelta}` : charDelta} chars
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#DCE1E8] text-[12px]">
                      <div className="p-3 bg-red-50/25">
                        <div className="text-[11px] uppercase font-bold text-red-700 mb-1 flex items-center justify-between">
                          <span>{leftTitle} (Before)</span>
                          <span className="text-[10px] font-normal text-[#667085]">{beforeText.length} chars</span>
                        </div>
                        <pre className="whitespace-pre-wrap break-all text-[#344054] max-h-56 overflow-y-auto font-sans leading-relaxed p-2 bg-white rounded-[6px] border border-red-100">
                          {beforeText || <span className="italic text-[#98A2B3]">No instructions</span>}
                        </pre>
                      </div>

                      <div className="p-3 bg-green-50/25">
                        <div className="text-[11px] uppercase font-bold text-[#15803D] mb-1 flex items-center justify-between">
                          <span>{rightTitle} (After)</span>
                          <span className="text-[10px] font-normal text-[#667085]">{afterText.length} chars</span>
                        </div>
                        <pre className="whitespace-pre-wrap break-all text-[#344054] max-h-56 overflow-y-auto font-sans leading-relaxed p-2 bg-white rounded-[6px] border border-green-100">
                          {afterText || <span className="italic text-[#98A2B3]">No instructions</span>}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              }

              // Specialized Renderer: Model Settings Diff
              if (key === "model_settings") {
                const beforeSettings = (item.before ?? {}) as Record<string, unknown>;
                const afterSettings = (item.after ?? {}) as Record<string, unknown>;
                const allSettingKeys = Array.from(
                  new Set([...Object.keys(beforeSettings), ...Object.keys(afterSettings)]),
                );

                return (
                  <div key={key} className="rounded-[10px] border border-[#DCE1E8] overflow-hidden shadow-xs">
                    <div className="bg-[#FAFBFD] px-4 py-2.5 flex items-center justify-between border-b border-[#DCE1E8]">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-[#FF571A]" />
                        <span className="font-semibold text-[#202125]">Model Settings Diagnostics</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="bg-[#F8F9FB] border-b border-[#EDF0F2] text-[#667085] font-semibold text-[11px] uppercase tracking-wider">
                            <th className="py-2.5 px-4">Parameter</th>
                            <th className="py-2.5 px-4">{leftTitle}</th>
                            <th className="py-2.5 px-4">{rightTitle}</th>
                            <th className="py-2.5 px-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EDF0F2]">
                          {allSettingKeys.map((settingKey) => {
                            const bVal = beforeSettings[settingKey];
                            const aVal = afterSettings[settingKey];
                            const isChanged = JSON.stringify(bVal) !== JSON.stringify(aVal);

                            return (
                              <tr
                                key={settingKey}
                                className={isChanged ? "bg-amber-50/20" : "hover:bg-[#FAFBFD]"}
                              >
                                <td className="py-2.5 px-4 font-mono font-medium text-[#202125]">
                                  {settingKey}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-[#475467]">
                                  {bVal !== undefined ? String(bVal) : <span className="italic text-[#98A2B3]">unset</span>}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-[#202125] font-semibold">
                                  {aVal !== undefined ? String(aVal) : <span className="italic text-[#98A2B3]">unset</span>}
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  {isChanged ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                      Modified
                                    </span>
                                  ) : (
                                    <span className="text-[#98A2B3] text-[11px]">Unchanged</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              // Specialized Renderer: Attached Tools Diff
              if (key === "tools") {
                const analysis = analyzeToolDiff(item.before, item.after);

                return (
                  <div key={key} className="rounded-[10px] border border-[#DCE1E8] overflow-hidden shadow-xs">
                    <div className="bg-[#FAFBFD] px-4 py-2.5 flex items-center justify-between border-b border-[#DCE1E8]">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-[#FF571A]" />
                        <span className="font-semibold text-[#202125]">Attached Tools Comparison</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        {analysis.added.length > 0 && (
                          <span className="px-2 py-0.5 rounded-[4px] font-semibold bg-green-50 text-green-700 border border-green-200">
                            +{analysis.added.length} added
                          </span>
                        )}
                        {analysis.removed.length > 0 && (
                          <span className="px-2 py-0.5 rounded-[4px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            -{analysis.removed.length} removed
                          </span>
                        )}
                        {analysis.modified.length > 0 && (
                          <span className="px-2 py-0.5 rounded-[4px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {analysis.modified.length} modified
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 space-y-3 bg-white">
                      {/* Added Tools */}
                      {analysis.added.map((tool) => (
                        <div
                          key={`added-${tool.name}`}
                          className="p-3 rounded-[8px] border border-green-200 bg-green-50/30 flex items-start justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold bg-green-100 text-green-800">
                                <Plus className="w-3 h-3" /> {tool.name}
                              </span>
                              {"method" in tool && "path_template" in tool && Boolean((tool as { method?: string }).method) && (
                                <span className="font-mono text-[11px] text-[#475467]">
                                  {(tool as { method?: string; path_template?: string }).method}{" "}
                                  {(tool as { method?: string; path_template?: string }).path_template}
                                </span>
                              )}
                            </div>
                            {tool.description && (
                              <p className="text-[12px] text-[#475467]">{tool.description}</p>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-green-100 text-green-800">
                            Added
                          </span>
                        </div>
                      ))}

                      {/* Removed Tools */}
                      {analysis.removed.map((tool) => (
                        <div
                          key={`removed-${tool.name}`}
                          className="p-3 rounded-[8px] border border-red-200 bg-red-50/30 flex items-start justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold bg-red-100 text-red-800">
                                <Minus className="w-3 h-3" /> {tool.name}
                              </span>
                            </div>
                            {tool.description && (
                              <p className="text-[12px] text-[#475467]">{tool.description}</p>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-800">
                            Removed
                          </span>
                        </div>
                      ))}

                      {/* Modified Tools */}
                      {analysis.modified.map(({ name, before, after }) => (
                        <div
                          key={`mod-${name}`}
                          className="p-3 rounded-[8px] border border-amber-200 bg-amber-50/30 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[12px] text-amber-900">
                              ⚡ {name}
                            </span>
                            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              Modified
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                            <div className="p-2 bg-white rounded border border-[#E4E7EC]">
                              <span className="text-[10px] font-bold text-red-700 block mb-1">Before:</span>
                              <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(before, null, 2)}</pre>
                            </div>
                            <div className="p-2 bg-white rounded border border-[#E4E7EC]">
                              <span className="text-[10px] font-bold text-[#15803D] block mb-1">After:</span>
                              <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(after, null, 2)}</pre>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Unchanged Tools */}
                      {analysis.unchanged.length > 0 && (
                        <div className="pt-2 border-t border-[#EDF0F2] text-[12px] text-[#667085] flex items-center gap-2">
                          <span className="font-medium">Unchanged tools ({analysis.unchanged.length}):</span>
                          <div className="flex flex-wrap gap-1">
                            {analysis.unchanged.map((t) => (
                              <span key={t.name} className="px-2 py-0.5 rounded bg-[#F2F4F7] font-mono text-[11px] text-[#475467]">
                                {t.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Fallback Generic Key-Value Renderer (channels, voice, environment, name, etc.)
              const beforeStr =
                typeof item.before === "object"
                  ? JSON.stringify(item.before, null, 2)
                  : String(item.before ?? "None");
              const afterStr =
                typeof item.after === "object"
                  ? JSON.stringify(item.after, null, 2)
                  : String(item.after ?? "None");

              return (
                <div key={key} className="rounded-[10px] border border-[#DCE1E8] overflow-hidden shadow-xs">
                  <div className="bg-[#FAFBFD] px-4 py-2 font-semibold font-mono text-[12px] text-[#202125] border-b border-[#DCE1E8] flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-[#FF571A]" />
                    <span>{key}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#DCE1E8] font-mono text-[12px]">
                    <div className="p-3 bg-red-50/30">
                      <div className="text-[11px] uppercase font-bold text-red-700 mb-1">
                        {leftTitle}
                      </div>
                      <pre className="whitespace-pre-wrap break-all text-[#202125] max-h-48 overflow-y-auto font-mono leading-relaxed p-2 bg-white rounded border border-red-100">
                        {beforeStr}
                      </pre>
                    </div>
                    <div className="p-3 bg-green-50/30">
                      <div className="text-[11px] uppercase font-bold text-[#15803D] mb-1">
                        {rightTitle}
                      </div>
                      <pre className="whitespace-pre-wrap break-all text-[#202125] max-h-48 overflow-y-auto font-mono leading-relaxed p-2 bg-white rounded border border-green-100">
                        {afterStr}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[#EDF0F2] flex items-center justify-between">
          <span className="text-[12px] text-[#667085]">
            Changes reflect immutable snapshots between the two selected releases.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[8px] text-[13px] font-medium text-[#202125] bg-white border border-[#DCE1E8] hover:bg-[#F8F9FB] transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
