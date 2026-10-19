"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getWorkflowRepository } from "../lib/repository";
import type {
  WorkflowDefinition,
  WorkflowListItem,
  WorkflowRun,
  WorkflowStatsData,
  WorkflowTemplateItem,
} from "../lib/types";
import {
  getWorkflowStatsApi,
  listWorkflowTemplatesApi,
  saveWorkflowApi,
  pauseWorkflowApi,
  activateWorkflowApi,
} from "../lib/client";
import { WorkflowBuilder } from "./workflow-builder";
import { WorkflowList } from "./workflow-list";
import { TemplateGallery } from "./templates/template-gallery";
import { WorkflowUnavailableState } from "./workflow-unavailable-state";
import { ExecutionHistory } from "./execution-history";
import { RunDetails } from "./run-details";

type View =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "edit"; workflowId: string }
  | { kind: "runs"; workflowId: string }
  | { kind: "run"; workflowId: string; runId: string };

function emptyWorkflow(workspaceId: string): WorkflowDefinition {
  return {
    id: "new",
    workspaceId,
    name: "Untitled workflow",
    description: "Custom event-driven workflow automation",
    status: "draft",
    version: 1,
    draft_revision: 1,
    trigger: { id: "trigger-new", eventType: "message.appended" },
    conditionGroup: null,
    actions: [],
  };
}

export function WorkflowsWorkspaceView({
  workspaceId,
  view,
}: {
  workspaceId: string;
  view: View;
}) {
  const repo = useMemo(() => getWorkflowRepository(false), []);
  const base = `/workspaces/${encodeURIComponent(workspaceId)}/workflows`;

  const [list, setList] = useState<WorkflowListItem[]>([]);
  const [stats, setStats] = useState<WorkflowStatsData | undefined>(undefined);
  const [templates, setTemplates] = useState<WorkflowTemplateItem[]>([]);
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal / drawer state
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setUnavailable(false);

    async function load() {
      // Load templates and stats in background with catch handlers
      void getWorkflowStatsApi(workspaceId, controller.signal)
        .then((res) => {
          if (!controller.signal.aborted && res.status === "ready") setStats(res.data);
        })
        .catch(() => {});
      void listWorkflowTemplatesApi(workspaceId, controller.signal)
        .then((res) => {
          if (!controller.signal.aborted && res.status === "ready") setTemplates(res.data);
        })
        .catch(() => {});

      if (view.kind === "list") {
        const res = await repo.listWorkflows(workspaceId, controller.signal);
        if (controller.signal.aborted) return;
        if (res.status === "unavailable") {
          setUnavailable(true);
          setList([]);
        } else if (res.status === "ready") {
          setList(res.data);
        } else {
          setError(res.message);
        }
        setLoading(false);
        return;
      }

      if (view.kind === "new") {
        setWorkflow(emptyWorkflow(workspaceId));
        setRuns([]);
        setLoading(false);
        return;
      }

      const wfRes = await repo.getWorkflow(workspaceId, view.workflowId, controller.signal);
      if (controller.signal.aborted) return;
      if (wfRes.status === "unavailable") {
        setUnavailable(true);
        setLoading(false);
        return;
      }
      if (wfRes.status !== "ready") {
        setError(wfRes.message);
        setLoading(false);
        return;
      }
      setWorkflow(wfRes.data);

      if (view.kind === "edit" || view.kind === "runs" || view.kind === "run") {
        const runsRes = await repo.listRuns(workspaceId, view.workflowId, controller.signal);
        if (!controller.signal.aborted && runsRes.status === "ready") setRuns(runsRes.data);
      }

      if (view.kind === "run") {
        const runRes = await repo.getRun(workspaceId, view.workflowId, view.runId, controller.signal);
        if (!controller.signal.aborted) {
          if (runRes.status === "ready") setRun(runRes.data);
          else if (runRes.status !== "unavailable") setError(runRes.message);
        }
      }

      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }

    void load().catch((err: unknown) => {
      if (controller.signal.aborted) return;
      if ((err as Error)?.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load workflows");
      setLoading(false);
    });

    return () => controller.abort();
  }, [repo, workspaceId, view]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      if (currentStatus === "active") {
        await pauseWorkflowApi(workspaceId, id);
      } else {
        await activateWorkflowApi(workspaceId, id);
      }
      const refreshed = await repo.listWorkflows(workspaceId);
      if (refreshed.status === "ready") setList(refreshed.data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  const handleSelectTemplate = async (template: WorkflowTemplateItem) => {
    try {
      setLoading(true);
      const res = await saveWorkflowApi(workspaceId, {
        id: "new",
        workspaceId,
        name: template.name,
        description: template.description,
        status: "draft",
        version: 1,
        draft_graph: template.graph,
        draft_revision: 1,
        trigger: { id: "trig", eventType: template.trigger_event_type },
        actions: [],
      });

      if (res.status === "ready") {
        window.location.href = `${base}/${encodeURIComponent(res.data.id)}`;
      } else {
        setError(res.message);
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create workflow from template");
      setLoading(false);
    }
  };

  if (unavailable) {
    return <WorkflowUnavailableState backUrl={base} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#FA5D19] animate-ping" />
          <span>Loading workflows…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl max-w-lg mx-auto my-8 space-y-2">
        <p className="text-sm font-bold text-rose-900">Could not load workflows</p>
        <p className="text-xs text-rose-700">{error}</p>
      </div>
    );
  }

  // 1. List View (Design Ref 2)
  if (view.kind === "list") {
    return (
      <>
        <WorkflowList
          workflows={list}
          stats={stats}
          newWorkflowUrl={`${base}/new`}
          getWorkflowUrl={(id) => `${base}/${encodeURIComponent(id)}`}
          getRunsUrl={(id) => `${base}/${encodeURIComponent(id)}/runs`}
          onDeleteWorkflow={async (id) => {
            const res = await repo.deleteWorkflow(workspaceId, id);
            if (res.status !== "ready") throw new Error(res.message);
            const refreshed = await repo.listWorkflows(workspaceId);
            if (refreshed.status === "ready") setList(refreshed.data);
          }}
          onOpenTemplates={() => setShowTemplatesModal(true)}
          onToggleStatus={handleToggleStatus}
        />

        {/* Template Gallery Modal */}
        {showTemplatesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-[960px] max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-150">
              <TemplateGallery
                templates={templates}
                onSelectTemplate={handleSelectTemplate}
                onStartFromScratch={() => {
                  window.location.href = `${base}/new`;
                }}
                onClose={() => setShowTemplatesModal(false)}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  // 2. New Workflow Screen (Design Ref 4: Template gallery or start from scratch)
  if (view.kind === "new") {
    return (
      <div className="max-w-6xl mx-auto py-4">
        <TemplateGallery
          templates={templates}
          onSelectTemplate={handleSelectTemplate}
          onStartFromScratch={async () => {
            setLoading(true);
            try { const result=await saveWorkflowApi(workspaceId,emptyWorkflow(workspaceId));
              if(result.status!=="ready")throw new Error(result.message);
              window.location.href=`${base}/${encodeURIComponent(result.data.id)}`;
            }catch(error){setError(error instanceof Error?error.message:"Could not create workflow");setLoading(false);}
          }}
          onClose={() => {
            window.location.href = base;
          }}
        />
      </div>
    );
  }

  if (!workflow) {
    return <WorkflowUnavailableState backUrl={base} />;
  }

  // 3. Single Run Diagnostics View (Design Ref 3)
  if (view.kind === "run" && run) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto py-4">
        <RunDetails
          run={run}
          onClose={() => {
            window.location.href = `${base}/${encodeURIComponent(workflow.id)}/runs`;
          }}
        />
      </div>
    );
  }

  // 4. Workflow Run History List View (Design Ref 3)
  if (view.kind === "runs") {
    return (
      <div className="space-y-4 max-w-6xl mx-auto py-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">{workflow.name} — Run History</h2>
            <p className="text-xs text-neutral-500">
              Audit log of all event executions, traces, and replay logs
            </p>
          </div>
          <a
            href={`${base}/${encodeURIComponent(workflow.id)}`}
            className="px-3 py-1.5 bg-[#FA5D19] hover:bg-[#e04f12] text-white rounded-lg text-xs font-semibold"
          >
            Open in Builder
          </a>
        </div>
        <ExecutionHistory
          runs={runs}
          runsBaseUrl={`${base}/${encodeURIComponent(workflow.id)}/runs`}
        />
      </div>
    );
  }

  // 5. Canvas Builder View (Design Ref 1)
  return (
    <WorkflowBuilder
      initialWorkflow={workflow}
      runs={runs}
      runsBaseUrl={`${base}/${encodeURIComponent(workflow.id === "new" ? "new" : workflow.id)}/runs`}
      backUrl={base}
      builderUrl={
        workflow.id === "new" ? `${base}/new` : `${base}/${encodeURIComponent(workflow.id)}`
      }
      isPreview={false}
      isNew={workflow.id === "new"}
      onSaveWorkflow={async (next) => {
        const res = await repo.saveWorkflow(workspaceId, next);
        if (res.status !== "ready") throw new Error(res.message);
        setWorkflow(res.data);
        if (workflow.id === "new" && typeof window !== "undefined") {
          window.location.href = `${base}/${encodeURIComponent(res.data.id)}`;
        }
      }}
    />
  );
}
