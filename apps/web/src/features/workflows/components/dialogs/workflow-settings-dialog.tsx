"use client";
import React, { useEffect, useState } from "react";
import { X, SlidersHorizontal, AlertTriangle } from "lucide-react";
import type { WorkflowSettings } from "../../lib/types";
export type WorkflowSettingsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  settings: WorkflowSettings;
  onSave: (s: WorkflowSettings) => void;
  inline?: boolean;
  workflowName?: string;
  description?: string | null;
  onMetadataChange?: (name: string, description: string) => void;
};
const input =
  "mt-2 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#FA5D19]";
export function WorkflowSettingsDialog({
  isOpen,
  onClose,
  settings,
  onSave,
  inline = false,
  workflowName,
  description,
  onMetadataChange,
}: WorkflowSettingsDialogProps) {
  const [current, setCurrent] = useState(settings),
    [name, setName] = useState(workflowName ?? ""),
    [detail, setDetail] = useState(description ?? "");
  useEffect(() => {
    if (isOpen) {
      setCurrent(structuredClone(settings));
      setName(workflowName ?? "");
      setDetail(description ?? "");
    }
  }, [isOpen]);
  if (!isOpen) return null;
  const toggle = (
    key: "deduplicate_incoming" | "prevent_recursive",
    label: string,
    helper: string,
  ) => (
    <label className="flex items-start justify-between gap-3">
      <span>
        {label}
        <span className="mt-1 block text-[11px] text-neutral-500">{helper}</span>
      </span>
      <input
        type="checkbox"
        className="accent-[#FA5D19]"
        checked={current[key]}
        onChange={(e) => setCurrent({ ...current, [key]: e.target.checked })}
      />
    </label>
  );
  return (
    <div
      className={
        inline
          ? "h-full overflow-y-auto bg-[#FAFAFA] p-6"
          : "fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      }
    >
      <div
        role={inline ? undefined : "dialog"}
        aria-modal={inline ? undefined : true}
        aria-label="Workflow settings"
        className={
          inline
            ? "mx-auto max-w-6xl"
            : "max-h-[90vh] w-[1000px] overflow-y-auto rounded-xl border bg-white p-6 shadow-xl"
        }
      >
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Workflow settings</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Control how this workflow runs and how failures are handled.
            </p>
          </div>
          <button aria-label="Close settings" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4 text-xs">
            {onMetadataChange && (
              <section className="space-y-3 rounded-lg border bg-white p-5">
                <h3 className="font-semibold">General</h3>
                <label className="block">
                  Workflow name
                  <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="block">
                  Description
                  <textarea
                    className={input}
                    rows={2}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                  />
                </label>
              </section>
            )}
            <section className="space-y-5 rounded-lg border bg-white p-5">
              <h3 className="font-semibold">Execution</h3>
              <div className="grid grid-cols-2 gap-4">
                <label>
                  Timezone
                  <select
                    className={input}
                    value={current.timezone}
                    onChange={(e) => setCurrent({ ...current, timezone: e.target.value })}
                  >
                    {["UTC", "Asia/Karachi", "America/New_York", "Europe/London"].map((zone) => (
                      <option key={zone}>{zone}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Maximum run duration · seconds
                  <input
                    className={input}
                    type="number"
                    min={1}
                    max={300}
                    value={current.max_run_duration_seconds}
                    onChange={(e) =>
                      setCurrent({ ...current, max_run_duration_seconds: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              {toggle(
                "deduplicate_incoming",
                "Deduplicate incoming events",
                "Event identity prevents a duplicate start.",
              )}
              {toggle(
                "prevent_recursive",
                "Prevent recursive triggers",
                "Ignore events carrying workflow provenance.",
              )}
              <p className="text-[11px] text-neutral-500">
                Concurrency scheduling is not connected yet. The stored limit is not a guarantee of
                parallel execution.
              </p>
            </section>
            <section className="space-y-4 rounded-lg border bg-white p-5">
              <h3 className="font-semibold">Failure handling</h3>
              <label className="block">
                Default on step failure
                <select
                  className={input}
                  value={current.default_failure_handling}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      default_failure_handling: e.target
                        .value as WorkflowSettings["default_failure_handling"],
                    })
                  }
                >
                  <option value="follow_error_path">Follow error path, otherwise stop</option>
                  <option value="stop">Stop execution</option>
                </select>
              </label>
              <div className="rounded-md bg-amber-50 p-3 text-amber-800">
                <AlertTriangle className="mr-2 inline h-4 w-4" />
                Automatic retry scheduling is not implemented. Requests are attempted once;
                uncertain writes are not resent automatically.
              </div>
            </section>
            <section className="space-y-3 rounded-lg border bg-white p-5">
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-neutral-500">
                Failure notification delivery requires the notification service integration. Alerts
                are not sent by the current worker.
              </p>
            </section>
          </div>
          <aside className="self-start rounded-lg border bg-white p-5 text-xs">
            <h3 className="mb-5 flex items-center gap-2 font-semibold">
              <SlidersHorizontal className="h-4 w-4" />
              Current configuration
            </h3>
            <dl className="grid grid-cols-2 gap-y-4">
              <dt className="text-neutral-500">Timezone</dt>
              <dd>{current.timezone}</dd>
              <dt className="text-neutral-500">Run timeout</dt>
              <dd>{current.max_run_duration_seconds} s</dd>
              <dt className="text-neutral-500">HTTP retries</dt>
              <dd>No automatic resend</dd>
            </dl>
            <p className="mt-5 border-t pt-4 text-neutral-500">
              Changes apply to future runs after the saved draft is activated.
            </p>
          </aside>
        </div>
        <footer className="mt-6 flex items-center justify-between border-t pt-4 text-xs">
          <p className="text-neutral-500">Apply to draft, then save using Save draft.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border bg-white px-4 py-2">
              Cancel
            </button>
            <button
              onClick={() => {
                onMetadataChange?.(name, detail);
                onSave(current);
                onClose();
              }}
              className="rounded-lg bg-[#FA5D19] px-4 py-2 text-white"
            >
              Apply changes
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
