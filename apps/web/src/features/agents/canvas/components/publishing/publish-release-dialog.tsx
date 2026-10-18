"use client";
import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Info, Lock, Upload, X } from "lucide-react";
import type { GraphValidationIssue } from "@quickstart/contracts";
export type PublishReleaseDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  draftRevision: number;
  currentReleaseNumber: number | null;
  nodesCount: number;
  edgesCount: number;
  validationIssues: GraphValidationIssue[];
  onOpenNode: (id: string) => void;
  onConfirmPublish: (notes?: string) => Promise<void>;
  changes?: { name: string; description: string }[];
};
export const PublishReleaseDialog: React.FC<PublishReleaseDialogProps> = (p) => {
  const [notes, setNotes] = useState(""),
    [publishing, setPublishing] = useState(false),
    [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null),
    close = useRef<HTMLButtonElement>(null),
    publishingRef = useRef(false);
  publishingRef.current = publishing;
  useEffect(() => {
    if (!p.isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    setPublishing(false);
    setError(null);
    close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !publishingRef.current) p.onClose();
      if (e.key === "Tab") {
        const elements = panel.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), textarea, [href], input:not(:disabled)",
        );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [p.isOpen]);
  if (!p.isOpen) return null;
  const errors = p.validationIssues.filter((i) => (i.type ?? i.severity) === "error"),
    warnings = p.validationIssues.filter((i) => (i.type ?? i.severity) === "warning"),
    next = (p.currentReleaseNumber ?? 0) + 1;
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-5">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="canvas-publish-title"
        className="w-full max-w-[920px] max-h-[90dvh] flex flex-col overflow-hidden rounded-xl border border-[#EDEDED] bg-white shadow-xl"
      >
        <header className="flex items-start gap-4 px-6 pt-6 pb-5 shrink-0">
          <Upload className="w-8 h-8 text-[#FA5D19]" />
          <div>
            <h2 id="canvas-publish-title" className="text-xl font-bold">
              Publish release
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              Review your draft before making it live.
            </p>
          </div>
          <button
            ref={close}
            aria-label="Close publish review"
            disabled={publishing}
            onClick={p.onClose}
            className="ml-auto p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="mx-6 mb-5 p-4 flex flex-wrap items-center gap-4 rounded-lg border bg-neutral-50 text-xs shrink-0">
          <strong>{p.agentName}</strong>
          <span className="bg-neutral-100 rounded px-2 py-1">Draft v{p.draftRevision}</span>
          <ArrowRight className="w-4 h-4" />
          <strong>Release #{next}</strong>
          <span className="ml-auto text-neutral-500">
            {p.currentReleaseNumber
              ? `● Release #${p.currentReleaseNumber} is currently live`
              : "No published release"}
          </span>
        </div>
        <div className="overflow-y-auto px-6 pb-5 grid md:grid-cols-2 gap-6 min-h-0">
          <section className="space-y-5 md:border-r md:pr-6 border-[#EDEDED]">
            <h3 className="text-base font-semibold">Changes in this release</h3>
            <p className="text-xs text-neutral-500">
              {p.nodesCount} nodes · {p.edgesCount} connections in this draft
            </p>
            {p.changes?.length ? (
              <div className="divide-y">
                {p.changes.map((c, i) => (
                  <div key={i} className="py-3">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-neutral-500 mt-1">{c.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                The saved configuration will be captured in this release.
              </p>
            )}
            <label className="block text-sm font-semibold">
              Release notes <span className="text-xs font-normal text-neutral-400">Optional</span>
              <textarea
                maxLength={2000}
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-3 w-full rounded-lg border border-neutral-200 p-3 text-[13px] font-normal outline-none focus:border-[#FA5D19]"
                placeholder="Describe what changed in this release."
              />
            </label>
            <div className="rounded-lg border bg-neutral-50 p-3 text-xs flex gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <p>
                Publishing creates an immutable snapshot. Existing flow sessions keep their pinned
                graph; new sessions use the published release.
              </p>
            </div>
          </section>
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold">Configuration review</h3>
              <span
                className={`rounded-full px-2 py-1 text-xs ${errors.length ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
              >
                {errors.length ? `${errors.length} issues` : "Ready to publish"}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              {errors.length
                ? "Resolve these before publishing."
                : "No blocking configuration issues were found."}
            </p>
            {[...errors, ...warnings].map((issue, i) => (
              <div
                key={i}
                className={`rounded-lg border border-l-4 p-4 space-y-3 ${issue.type === "error" ? "border-red-200 border-l-red-500" : "border-amber-200 border-l-amber-500"}`}
              >
                <p className="text-[13px] font-medium">{issue.message}</p>
                {issue.node_id && (
                  <button
                    className="text-xs rounded border px-3 py-1.5 flex items-center gap-2"
                    onClick={() => {
                      p.onClose();
                      p.onOpenNode(issue.node_id!);
                    }}
                  >
                    Open node
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <p className="text-xs text-neutral-500">
              Your draft is saved. Publishing changes the live release.
            </p>
            {error && (
              <p role="alert" className="p-3 bg-red-50 text-red-700 text-xs rounded">
                {error}
              </p>
            )}
          </section>
        </div>
        <footer className="shrink-0 border-t border-[#EDEDED] p-5 flex flex-wrap items-center gap-3">
          <p className="text-xs mr-auto flex items-center gap-2">
            {errors.length > 0 && (
              <>
                <AlertCircle className="w-4 h-4 text-red-600" />
                Publishing is blocked by {errors.length} configuration issues.
              </>
            )}
          </p>
          <button
            disabled={publishing}
            onClick={p.onClose}
            className="border rounded-lg px-4 py-2 text-xs"
          >
            Cancel
          </button>
          <button
            disabled={publishing || errors.length > 0}
            onClick={async () => {
              setPublishing(true);
              setError(null);
              try {
                await p.onConfirmPublish(notes.trim() || undefined);
                p.onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not publish.");
                setPublishing(false);
              }
            }}
            className="px-4 py-2 rounded-lg bg-[#FA5D19] text-white text-xs font-semibold flex gap-2 items-center disabled:bg-neutral-300 disabled:cursor-not-allowed"
          >
            {errors.length > 0 && <Lock className="w-3.5 h-3.5" />}
            {publishing ? "Publishing…" : `Publish release #${next}`}
          </button>
        </footer>
      </div>
    </div>
  );
};
