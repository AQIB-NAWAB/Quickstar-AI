"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Sparkles,
  StopCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cancelRun, getRun, getRunDeliveries, getRunResults } from "../lib/client";
import type {
  LeadGenerationCandidateResult,
  LeadGenerationDeliveryTask,
  LeadGenerationRunSummary,
} from "../lib/types";
import { LeadDetailDrawer } from "./lead-detail-drawer";

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
  const [selectedCandidate, setSelectedCandidate] =
    useState<LeadGenerationCandidateResult | null>(null);
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
    const items = resultsRes.data?.items ?? [];
    setResults(items);
    setDeliveries(deliveriesRes.data?.items ?? []);
    setError(null);

    // Keep selected candidate updated if drawer is open
    setSelectedCandidate((current) => {
      if (!current) return null;
      return items.find((r) => r.id === current.id) ?? current;
    });
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
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />
          <span>Loading lead research run…</span>
        </div>
      </div>
    );
  }

  const isRunning = run && ["queued", "running"].includes(run.status);
  const acceptedCount = results.filter((r) => r.status === "accepted").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <Link
            href={`/workspaces/${workspaceId}/lead-generation/runs`}
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            ← Back to Runs
          </Link>
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Run {runId.slice(0, 8)}
            </h1>
            {run && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  run.status === "completed"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : run.status === "running"
                    ? "bg-orange-50 text-orange-700 border border-orange-200 animate-pulse"
                    : run.status === "failed" || run.status === "cancelled"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                }`}
              >
                {isRunning && <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping" />}
                {run.status}
              </span>
            )}
          </div>
          {run?.stop_reason && (
            <p className="mt-1 text-xs text-neutral-500">
              Stop reason: <span className="font-medium text-neutral-700">{run.stop_reason}</span>
            </p>
          )}
        </div>

        {isRunning && (
          <button
            type="button"
            disabled={cancelling}
            onClick={() => void onCancel()}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 self-start sm:self-auto shadow-xs"
          >
            <StopCircle className="h-3.5 w-3.5" />
            <span>{cancelling ? "Cancelling…" : "Cancel run"}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      {/* Metric Highlights */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-neutral-500">Total Candidates</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{results.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-neutral-500">Accepted Leads</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{acceptedCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-neutral-500">Duplicates / Skipped</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {results.filter((r) => r.status === "duplicate" || r.status === "rejected").length}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-neutral-500">Campaign Deliveries</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{deliveries.length}</p>
        </div>
      </div>

      {/* Discovered Leads Table Overview */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Discovered Leads</h2>
            <p className="text-xs text-neutral-500">
              Overview table of extracted prospects. Click any row to inspect complete research details, evidence, and dynamic fields in the sidebar.
            </p>
          </div>
          <span className="text-xs font-medium text-neutral-500">
            {results.length} record{results.length === 1 ? "" : "s"}
          </span>
        </div>

        {results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-xs">
            <Building2 className="mx-auto h-8 w-8 text-neutral-400" />
            <h3 className="mt-2 text-sm font-semibold text-neutral-900">No candidate leads yet</h3>
            <p className="mt-1 text-xs text-neutral-500">
              {isRunning
                ? "The research agent is searching providers and verifying public contact points…"
                : "This run finished without finding candidates matching the criteria."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50/80 font-semibold text-neutral-700">
                <tr>
                  <th scope="col" className="px-4 py-3 min-w-[180px]">Company / Name</th>
                  <th scope="col" className="px-4 py-3 min-w-[180px]">Email (Mandatory)</th>
                  <th scope="col" className="px-4 py-3 min-w-[140px]">Phone (Mandatory)</th>
                  <th scope="col" className="px-4 py-3 min-w-[160px]">Website</th>
                  <th scope="col" className="px-4 py-3 min-w-[120px]">Location</th>
                  <th scope="col" className="px-4 py-3 text-center min-w-[100px]">Fit Score</th>
                  <th scope="col" className="px-4 py-3 min-w-[90px]">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {results.map((row) => {
                  const lead = row.assessment;
                  const isSelected = selectedCandidate?.id === row.id;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedCandidate(row)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-orange-50/70"
                          : "hover:bg-neutral-50"
                      }`}
                    >
                      {/* Company Name */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-neutral-900">
                          {lead?.company_name || row.id.slice(0, 8)}
                        </div>
                        {lead?.category && (
                          <span className="text-[11px] text-neutral-400">
                            {lead.category}
                          </span>
                        )}
                      </td>

                      {/* Email (Mandatory) */}
                      <td className="px-4 py-3">
                        {lead?.email ? (
                          <div className="flex items-center gap-1.5 text-neutral-800">
                            <Mail className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                            <span className="truncate max-w-[170px]">{lead.email}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">None found</span>
                        )}
                      </td>

                      {/* Phone (Mandatory) */}
                      <td className="px-4 py-3">
                        {lead?.phone ? (
                          <div className="flex items-center gap-1.5 text-neutral-800">
                            <Phone className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                            <span>{lead.phone}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">None found</span>
                        )}
                      </td>

                      {/* Website */}
                      <td className="px-4 py-3">
                        {lead?.website ? (
                          <a
                            href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline max-w-[150px] truncate"
                          >
                            <span className="truncate">{lead.website.replace(/^https?:\/\//, "")}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-neutral-400 italic">—</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3 text-neutral-700">
                        {lead?.location ? (
                          <span className="truncate max-w-[110px] block">{lead.location}</span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      {/* Fit Score */}
                      <td className="px-4 py-3 text-center">
                        {lead?.fit_score !== undefined ? (
                          <span
                            className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              lead.fit_score >= 80
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : lead.fit_score >= 60
                                ? "bg-orange-50 text-orange-700 border border-orange-200"
                                : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                            }`}
                          >
                            {lead.fit_score}%
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            row.status === "accepted"
                              ? "bg-emerald-100 text-emerald-800"
                              : row.status === "duplicate"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCandidate(row);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Campaign / CRM Deliveries Section */}
      <section className="space-y-3 pt-4 border-t border-neutral-200">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Campaign Ingest & Deliveries</h2>
          <p className="text-xs text-neutral-500">
            Handoff of qualified prospects to active dialer campaigns or CRM ingest pipelines.
          </p>
        </div>

        {deliveries.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-xs text-neutral-500 shadow-xs">
            No automated campaign deliveries configured for this research run.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
            <ul className="divide-y divide-neutral-100 text-xs">
              {deliveries.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-neutral-500">
                      Task {d.id.slice(0, 8)}…
                    </span>
                    {d.error_code && (
                      <span className="text-[11px] font-medium text-red-600">
                        ({d.error_code})
                      </span>
                    )}
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      d.state === "completed" || d.state === "delivered"
                        ? "bg-emerald-100 text-emerald-800"
                        : d.state === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {d.state}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Slide-over Detail Drawer / Sidebar */}
      {selectedCandidate && (
        <>
          {/* Backdrop overlay covering the screen */}
          <div
            className="fixed inset-0 !m-0 !mt-0 z-40 bg-black/30 backdrop-blur-[2px] animate-backdrop-in"
            onClick={() => setSelectedCandidate(null)}
          />
          <LeadDetailDrawer
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
          />
        </>
      )}
    </div>
  );
}
