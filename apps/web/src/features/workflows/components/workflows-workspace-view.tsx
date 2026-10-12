"use client";

import { useEffect, useMemo, useState } from "react";
import { getWorkflowRepository } from "../lib/repository";
import type { WorkflowDefinition, WorkflowListItem, WorkflowRun } from "../lib/types";
import { WorkflowBuilder } from "./workflow-builder";
import { WorkflowList } from "./workflow-list";
import { WorkflowUnavailableState } from "./workflow-unavailable-state";
import { ExecutionHistory } from "./execution-history";
import { RunDetails } from "./run-details";
import { WorkflowHeader } from "./workflow-header";

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
    description: null,
    status: "draft",
    version: 1,
    trigger: { id: "trigger-new", eventType: "conversation.handed_off" },
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
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setUnavailable(false);

    async function load() {
      if (view.kind === "list") {
        const res = await repo.listWorkflows(workspaceId, controller.signal);
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
        if (runsRes.status === "ready") setRuns(runsRes.data);
      }

      if (view.kind === "run") {
        const runRes = await repo.getRun(workspaceId, view.workflowId, view.runId, controller.signal);
        if (runRes.status === "ready") setRun(runRes.data);
        else if (runRes.status !== "unavailable") setError(runRes.message);
      }

      setLoading(false);
    }

    void load().catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load workflows");
      setLoading(false);
    });

    return () => controller.abort();
  }, [repo, workspaceId, view]);

  if (unavailable) {
    return <WorkflowUnavailableState backUrl={base} />;
  }

  if (loading) {
    return <p className="text-xs text-neutral-500 p-6">Loading workflows…</p>;
  }

  if (error) {
    return (
      <div className="p-6 space-y-2">
        <p className="text-sm font-semibold text-accent-black">Could not load workflows</p>
        <p className="text-xs text-neutral-500">{error}</p>
      </div>
    );
  }

  if (view.kind === "list") {
    return (
      <WorkflowList
        workflows={list}
        newWorkflowUrl={`${base}/new`}
        getWorkflowUrl={(id) => `${base}/${encodeURIComponent(id)}`}
        getRunsUrl={(id) => `${base}/${encodeURIComponent(id)}/runs`}
        onDeleteWorkflow={async (id) => {
          const res = await repo.deleteWorkflow(workspaceId, id);
          if (res.status !== "ready") throw new Error(res.message);
          const refreshed = await repo.listWorkflows(workspaceId);
          if (refreshed.status === "ready") setList(refreshed.data);
        }}
      />
    );
  }

  if (!workflow) {
    return <WorkflowUnavailableState backUrl={base} />;
  }

  if (view.kind === "run" && run) {
    return (
      <div className="space-y-4">
        <WorkflowHeader
          workflow={workflow}
          isNew={false}
          isDirty={false}
          isSaving={false}
          isPreview={false}
          activeTab="runs"
          backUrl={base}
          runsUrl={`${base}/${encodeURIComponent(workflow.id)}/runs`}
          builderUrl={`${base}/${encodeURIComponent(workflow.id)}`}
          onSaveDraft={() => undefined}
          onToggleActive={() => undefined}
          onUpdateMetadata={() => undefined}
        />
        <RunDetails run={run} />
      </div>
    );
  }

  if (view.kind === "runs") {
    return (
      <div className="space-y-4">
        <WorkflowHeader
          workflow={workflow}
          isNew={false}
          isDirty={false}
          isSaving={false}
          isPreview={false}
          activeTab="runs"
          backUrl={base}
          runsUrl={`${base}/${encodeURIComponent(workflow.id)}/runs`}
          builderUrl={`${base}/${encodeURIComponent(workflow.id)}`}
          onSaveDraft={() => undefined}
          onToggleActive={() => undefined}
          onUpdateMetadata={() => undefined}
        />
        <ExecutionHistory
          runs={runs}
          runsBaseUrl={`${base}/${encodeURIComponent(workflow.id)}/runs`}
        />
      </div>
    );
  }

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
      isNew={view.kind === "new"}
      onSaveWorkflow={async (next) => {
        const res = await repo.saveWorkflow(workspaceId, next);
        if (res.status !== "ready") throw new Error(res.message);
        setWorkflow(res.data);
        if (view.kind === "new" && typeof window !== "undefined") {
          window.location.href = `${base}/${encodeURIComponent(res.data.id)}`;
        }
      }}
    />
  );
}
