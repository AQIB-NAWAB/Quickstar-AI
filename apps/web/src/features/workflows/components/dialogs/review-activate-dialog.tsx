"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Play,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { WorkflowValidationResult, WorkflowSimulationResult } from "../../lib/types";

export type ReviewActivateDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  workflowName: string;
  currentRevision: number;
  activeVersionNumber: number | null;
  validation: WorkflowValidationResult;
  lastSimulation: WorkflowSimulationResult | null;
  onRunSimulation: () => Promise<WorkflowSimulationResult>;
  onActivate: (changelog?: string) => Promise<void>;
};

export const ReviewActivateDialog: React.FC<ReviewActivateDialogProps> = ({
  isOpen,
  onClose,
  workflowName,
  currentRevision,
  activeVersionNumber,
  validation,
  lastSimulation,
  onRunSimulation,
  onActivate,
}) => {
  const [changelog, setChangelog] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = dialogRef.current;
    panel?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isActivating) onClose();
      if (event.key === "Tab") {
        const list = Array.from(
          panel?.querySelectorAll<HTMLElement>(
            "button:not([disabled]),input,textarea,select,a[href]",
          ) ?? [],
        );
        const first = list[0],
          last = list.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [isOpen, isActivating]);
  if (!isOpen) return null;

  const nextVersionNumber = (activeVersionNumber ?? 0) + 1;
  const canActivate =
    validation.valid && validation.blockers.length === 0 && validation.revision === currentRevision;

  const handleTest = async () => {
    setIsRunningTest(true);
    setErrorMsg(null);
    try {
      await onRunSimulation();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Test simulation failed");
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleConfirmActivate = async () => {
    setIsActivating(true);
    setErrorMsg(null);
    try {
      await onActivate(changelog.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Review and activate workflow"
        className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-[1040px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Review and activate workflow</h2>
              <p className="text-xs text-neutral-500">
                Pre-flight validation check and release checklist
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-5 text-xs text-neutral-800">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-5">
            {/* Step 1: Pre-flight Validation Checks */}
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-900 text-xs flex items-center gap-2">
                  {validation.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>1. Pre-Flight Graph Validation</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    validation.valid
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {validation.valid ? "Validation Passed" : "Action Required"}
                </span>
              </div>

              {/* Blockers */}
              {validation.blockers.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-rose-700 block text-[11px]">
                    Blocking Issues ({validation.blockers.length}):
                  </span>
                  {validation.blockers.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      <div>
                        <span className="font-semibold block">{b.message}</span>
                        {b.node_id && (
                          <span className="text-[10px] text-rose-600 font-mono">
                            Node ID: {b.node_id}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="font-semibold text-amber-700 block text-[11px]">
                    Advisory Warnings ({validation.warnings.length}):
                  </span>
                  {validation.warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <span className="leading-tight">{w.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {validation.blockers.length === 0 && validation.warnings.length === 0 && (
                <p className="text-[11px] text-emerald-700">
                  All nodes, ports, and execution edges are connected and valid.
                </p>
              )}
            </div>

            {/* Step 2: Latest Test Execution */}
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-900 text-xs flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#FA5D19]" />
                  <span>2. Test Dry-Run Result</span>
                </span>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isRunningTest}
                  className="px-2.5 py-1 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-lg text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isRunningTest ? "Running..." : "Run Test Now"}</span>
                </button>
              </div>

              {lastSimulation && lastSimulation.revision === currentRevision ? (
                <div className="p-3 bg-white border border-neutral-200 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-neutral-900 block">
                      Simulation{" "}
                      {lastSimulation.status === "succeeded"
                        ? "Succeeded ✓"
                        : lastSimulation.status}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {lastSimulation.traces.length} steps simulated in {lastSimulation.duration_ms}
                      ms
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      lastSimulation.status === "succeeded"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    {lastSimulation.status.toUpperCase()}
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-neutral-500">
                  No dry-run test performed yet. We recommend running a test simulation to verify
                  condition branches.
                </p>
              )}
            </div>
          </div>
          {/* Step 3: Activation Summary & Versioning Notice */}
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-3">
            <span className="font-bold text-neutral-900 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-neutral-600" />
              <span>3. Release Version & Activation</span>
            </span>

            <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-600">Workflow:</span>
                <span className="font-bold text-neutral-900">{workflowName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-600">Current Draft Revision:</span>
                <span className="font-mono text-neutral-700">rev #{currentRevision}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-neutral-100 pt-2">
                <span className="text-neutral-600">Frozen Version to Publish:</span>
                <span className="font-bold text-[#FA5D19] bg-orange-50 px-2 py-0.5 rounded font-mono">
                  v{nextVersionNumber}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-neutral-700">Release Notes / Changelog</label>
              <input
                type="text"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="e.g. Added VIP escalation condition and updated HubSpot webhook"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-[#FA5D19]"
              />
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 text-amber-900 rounded-lg text-[11px]">
              <span className="font-semibold block mb-0.5">Live Execution Notice:</span>
              New matching events will execute this saved version. Past events are not replayed.
              Review all external effects before activation.
            </div>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 rounded-lg text-xs font-semibold text-neutral-700 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmActivate}
            disabled={!canActivate || isActivating}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all ${
              canActivate && !isActivating
                ? "bg-[#FA5D19] hover:bg-[#e04f12] text-white hover:shadow-md cursor-pointer"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
            }`}
          >
            <span>{isActivating ? "Activating..." : `Activate Version v${nextVersionNumber}`}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
