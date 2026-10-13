"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cancelRun, getRun, getRunDeliveries, getRunResults } from "../lib/client";
import type {
  LeadGenerationCandidateResult,
  LeadGenerationDeliveryTask,
  LeadGenerationRunSummary,
} from "../lib/types";

export function LeadGenerationRunDetailPage({
  workspaceId,
  runId,
}: {
  workspaceId: string;
  runId: string;
}) {
  const [run, setRun] = useState<LeadGenerationRunSummary | null>(null);
  const [results, setResults] = useState<LeadGenerationCandidateResult[]>([]);
  const [deliveries, setDeliveries] = useState<LeadGenerationDeliveryTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    const [runRes, resultsRes, deliveriesRes] = await Promise.all([
      getRun(workspaceId, runId),
      getRunResults(workspaceId, runId),
      getRunDeliveries(workspaceId, runId),
    ]);
    if (runRes.error || !runRes.data?.run) {
      setError(runRes.error?.message ?? "Failed to load run");
      return;
    }
    setRun(runRes.data.run);
    setResults(resultsRes.data?.items ?? []);
    setDeliveries(deliveriesRes.data?.items ?? []);
    setError(null);
  }, [workspaceId, runId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!run || !["queued", "running"].includes(run.status)) return;
    const t = setInterval(() => void load(), 2000);
    return () => clearInterval(t);
  }, [run, load]);

  async function onCancel() {
    setCancelling(true);
    await cancelRun(workspaceId, runId);
    setCancelling(false);
    await load();
  }

  if (!run && !error) {
    return <p className="text-sm text-muted-foreground">Loading run…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/workspaces/${workspaceId}/lead-generation/runs`}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Runs
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Run {runId.slice(0, 8)}…</h1>
          {run ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Status <span className="font-medium text-foreground">{run.status}</span>
              {" · "}accepted {Number(run.accepted ?? 0)}
              {run.stop_reason ? ` · ${run.stop_reason}` : ""}
            </p>
          ) : null}
        </div>
        {run && ["queued", "running"].includes(run.status) ? (
          <button
            type="button"
            disabled={cancelling}
            onClick={() => void onCancel()}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel remaining"}
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Results</h2>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No candidates yet.</p>
        ) : (
          <ul className="space-y-3">
            {results.map((row) => {
              const lead = row.assessment;
              return (
                <li key={row.id} className="rounded-md border border-border px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {lead?.company_name ?? row.id.slice(0, 8)}
                    </span>
                    <span className="text-muted-foreground">{row.status}</span>
                  </div>
                  {lead ? (
                    <p className="mt-1 text-muted-foreground">
                      {lead.website}
                      {lead.email ? ` · ${lead.email}` : ""}
                      {lead.phone ? ` · ${lead.phone}` : ""}
                      {" · "}fit {lead.fit_score}
                    </p>
                  ) : null}
                  {lead?.summary ? <p className="mt-2">{lead.summary}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Deliveries</h2>
        {deliveries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No campaign deliveries for this run.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {deliveries.map((d) => (
              <li key={d.id} className="flex justify-between px-4 py-2">
                <span>{d.id.slice(0, 8)}…</span>
                <span>
                  {d.state}
                  {d.error_code ? ` (${d.error_code})` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
