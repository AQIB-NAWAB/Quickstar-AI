"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";
import { previewStore } from "../lib/preview-store";
import type { WorkflowDefinition,WorkflowListItem,WorkflowRun } from "../lib/types";
import { ExecutionHistory } from "./execution-history";
import { RunDetails } from "./run-details";
import { WorkflowBuilder } from "./workflow-builder";
import { WorkflowHeader } from "./workflow-header";
import { WorkflowList } from "./workflow-list";

interface WorkflowPreviewViewProps {
  view: string[];
}

export function WorkflowPreviewView({ view }: WorkflowPreviewViewProps) {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowDefinition | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [loading, setLoading] = useState(true);

  const subRoute = view[1]; // e.g. "new", "payment-escalation"
  const tabOrRuns = view[2]; // e.g. "runs"
  const specificRunId = view[3]; // e.g. "run_1041"

  useEffect(() => {
    async function load() {
      setLoading(true);
      const listRes = await previewStore.listWorkflows("local-preview");
      if (listRes.status === "ready") {
        setWorkflows(listRes.data);
      }

      if (subRoute && subRoute !== "new") {
        const wfRes = await previewStore.getWorkflow("local-preview", subRoute);
        if (wfRes.status === "ready") {
          setActiveWorkflow(wfRes.data);
        }
        const runsRes = await previewStore.listRuns("local-preview", subRoute);
        if (runsRes.status === "ready") {
          setRuns(runsRes.data);
          if (specificRunId) {
            const foundRun = runsRes.data.find((r) => r.id === specificRunId);
            setSelectedRun(foundRun || null);
          }
        }
      } else if (subRoute === "new") {
        const newWf: WorkflowDefinition = {
          id: `workflow-${Date.now()}`,
          workspaceId: "local-preview",
          name: "Untitled workflow",
          description: null,
          status: "draft",
          version: 1,
          trigger: {
            id: `node-trigger-${Date.now()}`,
            eventType: "message.appended",
            displayName: "Message appended",
            description: "When a new message arrives.",
          },
          actions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setActiveWorkflow(newWf);
        setRuns([]);
      }

      setLoading(false);
    }

    load();
  }, [subRoute, specificRunId]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-neutral-400">Loading sample data...</div>;
  }

  // Route: /preview/workflows
  if (!subRoute) {
    return (
      <WorkflowList
        workflows={workflows}
        isUnavailable={false}
        newWorkflowUrl="/preview/workflows/new"
        getWorkflowUrl={(id) => `/preview/workflows/${encodeURIComponent(id)}`}
        getRunsUrl={(id) => `/preview/workflows/${encodeURIComponent(id)}/runs`}
        onDeleteWorkflow={async (id) => {
          await previewStore.deleteWorkflow("local-preview", id);
          const listRes = await previewStore.listWorkflows("local-preview");
          if (listRes.status === "ready") {
            setWorkflows(listRes.data);
          }
        }}
      />
    );
  }

  // Route: /preview/workflows/[workflowId]/runs/[runId]
  if (subRoute && tabOrRuns === "runs" && specificRunId && selectedRun) {
    const runsListUrl = `/preview/workflows/${encodeURIComponent(subRoute)}/runs`;
    return (
      <div className="space-y-4">
        <Link
          href={runsListUrl}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-heat-100 hover:text-[#e04e10]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Execution history</span>
        </Link>
        <RunDetails run={selectedRun} />
      </div>
    );
  }

  // Route: /preview/workflows/[workflowId]/runs
  if (subRoute && tabOrRuns === "runs" && activeWorkflow) {
    const builderUrl = `/preview/workflows/${encodeURIComponent(subRoute)}`;
    const runsUrl = `/preview/workflows/${encodeURIComponent(subRoute)}/runs`;
    return (
      <div className="space-y-6">
        <WorkflowHeader
          workflow={activeWorkflow}
          isPreview={true}
          activeTab="runs"
          backUrl="/preview/workflows"
          runsUrl={runsUrl}
          builderUrl={builderUrl}
          onSaveDraft={() => {}}
          onUpdateMetadata={() => {}}
        />
        <ExecutionHistory
          runs={runs}
          runsBaseUrl={runsUrl}
          isRecent={false}
          initialSelectedRunId={runs.length > 1 ? runs[1].id : null}
        />
      </div>
    );
  }

  // Route: /preview/workflows/[workflowId] or /preview/workflows/new
  if (activeWorkflow) {
    const runsUrl = `/preview/workflows/${encodeURIComponent(subRoute)}/runs`;
    const builderUrl = `/preview/workflows/${encodeURIComponent(subRoute)}`;
    return (
      <WorkflowBuilder
        initialWorkflow={activeWorkflow}
        runs={runs}
        runsBaseUrl={runsUrl}
        backUrl="/preview/workflows"
        builderUrl={builderUrl}
        isPreview={true}
        isNew={subRoute === "new"}
        onSaveWorkflow={async (wf) => {
          await previewStore.saveWorkflow("local-preview", wf);
          setActiveWorkflow(wf);
        }}
      />
    );
  }

  return (
    <div className="p-8 text-center text-xs text-neutral-400">
      Workflow not found in preview store.
    </div>
  );
}
