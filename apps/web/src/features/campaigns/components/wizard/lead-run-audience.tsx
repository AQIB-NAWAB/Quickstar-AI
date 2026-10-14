"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { listAllRunResults, listRuns } from "../../../lead-generation/lib/client";
import type { LeadGenerationRunSummary } from "../../../lead-generation/lib/types";
import { leadRunDraftPatch, runLeadRows, type RunLeadRow } from "../../lib/lead-run-audience";
import type { CampaignTelephonyMode, WizardDraft } from "../../lib/types";

interface LeadRunAudienceProps {
  workspaceId: string;
  draft: WizardDraft;
  telephonyMode: CampaignTelephonyMode;
  onUpdate: (updated: Partial<WizardDraft>) => void;
}

function runLabel(run: LeadGenerationRunSummary): string {
  const brief = run.brief;
  const place = brief?.location?.trim();
  const categories = brief?.categories?.slice(0, 2).join(", ");
  const accepted = Number(run.accepted ?? 0);
  const when = run.created_at ? new Date(run.created_at).toLocaleDateString() : "";
  const focus = [categories, place].filter(Boolean).join(" · ");
  return [focus || `Run ${run.id.slice(0, 8)}`, `${accepted} accepted`, when]
    .filter(Boolean)
    .join(" · ");
}

function leadIsSelectable(
  lead: RunLeadRow,
  telephonyMode: CampaignTelephonyMode,
): boolean {
  if (telephonyMode === "required") return lead.dialable;
  return Boolean(lead.company.trim() || lead.email.trim());
}

export function LeadRunAudience({
  workspaceId,
  draft,
  telephonyMode,
  onUpdate,
}: LeadRunAudienceProps) {
  const [runs, setRuns] = useState<LeadGenerationRunSummary[]>([]);
  const [leads, setLeads] = useState<RunLeadRow[]>([]);
  const [selected, setSelected] = useState<string[]>(draft.selectedLeadIds ?? []);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const runsRef = useRef(runs);
  onUpdateRef.current = onUpdate;
  runsRef.current = runs;

  useEffect(() => {
    const controller = new AbortController();
    setLoadingRuns(true);
    listRuns(workspaceId, controller.signal).then((res) => {
      if (controller.signal.aborted) return;
      setLoadingRuns(false);
      if (res.error || !res.data) {
        setError(res.error?.message ?? "Could not load lead generation runs.");
        return;
      }
      const withAccepted = res.data.items.filter((run) => Number(run.accepted ?? 0) > 0);
      setRuns(withAccepted);
    });
    return () => controller.abort();
  }, [workspaceId]);

  useEffect(() => {
    if (!draft.leadRunId) return;
    const run = runs.find((item) => item.id === draft.leadRunId);
    if (!run) return;
    const label = runLabel(run);
    if (draft.fileName === label) return;
    onUpdateRef.current({ fileName: label });
  }, [runs, draft.leadRunId, draft.fileName]);

  useEffect(() => {
    if (!draft.leadRunId) {
      setLeads([]);
      return;
    }
    const controller = new AbortController();
    setLoadingLeads(true);
    setError(null);
    listAllRunResults(workspaceId, draft.leadRunId, controller.signal).then((res) => {
      if (controller.signal.aborted) return;
      setLoadingLeads(false);
      if (res.error || !res.data) {
        setError(res.error?.message ?? "Could not load accepted leads for this run.");
        setLeads([]);
        return;
      }
      const rows = runLeadRows(res.data.items);
      setLeads(rows);
      const known = new Set(draft.selectedLeadIds ?? []);
      const next =
        known.size > 0
          ? rows.filter((row) => known.has(row.id) && leadIsSelectable(row, telephonyMode)).map(
              (row) => row.id,
            )
          : rows.filter((row) => leadIsSelectable(row, telephonyMode)).map((row) => row.id);
      setSelected(next);
      const run = runsRef.current.find((item) => item.id === draft.leadRunId);
      onUpdateRef.current(
        leadRunDraftPatch(
          draft.leadRunId!,
          run ? runLabel(run) : "Lead generation run",
          rows,
          next,
          telephonyMode,
        ),
      );
    });
    return () => controller.abort();
  }, [workspaceId, draft.leadRunId, telephonyMode]);

  function apply(runId: string, rows: RunLeadRow[], ids: string[]) {
    const run = runs.find((item) => item.id === runId);
    onUpdate(
      leadRunDraftPatch(runId, run ? runLabel(run) : "Lead generation run", rows, ids, telephonyMode),
    );
  }

  function chooseRun(runId: string) {
    setSelected([]);
    setLeads([]);
    onUpdate({
      audienceSource: "lead_run",
      leadRunId: runId,
      selectedLeadIds: [],
      fileName: "",
      rowCount: 0,
      parsedRows: [],
      preparedTargets: [],
      validCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
    });
  }

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
    setSelected(next);
    if (draft.leadRunId) apply(draft.leadRunId, leads, next);
  }

  function toggleAll(on: boolean) {
    const next = on
      ? leads.filter((lead) => leadIsSelectable(lead, telephonyMode)).map((lead) => lead.id)
      : [];
    setSelected(next);
    if (draft.leadRunId) apply(draft.leadRunId, leads, next);
  }

  const selectableCount = leads.filter((lead) => leadIsSelectable(lead, telephonyMode)).length;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
          Lead generation run
        </label>
        <select
          value={draft.leadRunId ?? ""}
          onChange={(event) => chooseRun(event.target.value)}
          disabled={loadingRuns}
          className="w-full px-2.5 py-2 border border-border-faint rounded-6 bg-white text-sm focus:outline-none focus:border-heat-100"
        >
          <option value="">
            {loadingRuns ? "Loading runs…" : "Select a run with accepted leads"}
          </option>
          {runs.map((run) => (
            <option key={run.id} value={run.id}>
              {runLabel(run)}
            </option>
          ))}
        </select>
        {!loadingRuns && runs.length === 0 && (
          <p className="text-xs text-neutral-500">
            No runs with accepted leads yet. Finish a lead generation run, then come back here.
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-8">{error}</div>
      )}

      {loadingLeads && <p className="text-xs text-neutral-500">Loading accepted leads…</p>}

      {leads.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Accepted leads
            </h4>
            <button
              type="button"
              onClick={() => toggleAll(selected.length !== selectableCount)}
              className="text-xs font-semibold text-heat-100 hover:underline"
            >
              {selected.length === selectableCount
                ? "Clear"
                : telephonyMode === "required"
                  ? "Select all with a phone"
                  : "Select all with name or email"}
            </button>
          </div>
          <div className="border border-border-faint rounded-8 max-h-72 overflow-y-auto divide-y divide-border-faint">
            {leads.map((lead) => (
              <label
                key={lead.id}
                className={`flex items-start gap-3 p-3 text-xs ${leadIsSelectable(lead, telephonyMode) ? "cursor-pointer" : "opacity-60"}`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={selected.includes(lead.id)}
                  disabled={!leadIsSelectable(lead, telephonyMode)}
                  onChange={() => toggle(lead.id)}
                />
                <span className="min-w-0">
                  <span className="block font-semibold text-accent-black truncate">{lead.company}</span>
                  <span className="block text-neutral-500 truncate">
                    {[lead.location, lead.phone || "No phone", lead.email].filter(Boolean).join(" · ")}
                  </span>
                  {lead.skipReason && (
                    <span className="block text-amber-700 mt-0.5">{lead.skipReason}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-8 flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">
              {draft.validCount} selected for dialing
              {draft.invalidCount ? ` · ${draft.invalidCount} skipped` : ""}
              {draft.duplicateCount ? ` · ${draft.duplicateCount} duplicates` : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
