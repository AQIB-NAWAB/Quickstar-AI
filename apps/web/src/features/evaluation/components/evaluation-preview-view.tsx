"use client";

import { useEffect,useState } from "react";
import { evaluationPreviewStore } from "../lib/preview-store";
import type {
EvaluationCase,
EvaluationCaseResult,
EvaluationDataset,
EvaluationOverviewData,
EvaluationRun,
} from "../lib/types";
import { AgentEvaluationPage } from "./agent-evaluation-page";
import { DatasetEditor } from "./dataset-editor";
import { DatasetForm } from "./dataset-form";
import { DatasetList } from "./dataset-list";
import { RunDetail } from "./run-detail";
import { RunHistory } from "./run-history";

interface EvaluationPreviewViewProps {
  view: string[];
}

export function EvaluationPreviewView({ view }: EvaluationPreviewViewProps) {
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<EvaluationOverviewData | null>(null);
  const [datasets, setDatasets] = useState<EvaluationDataset[]>([]);
  const [currentDataset, setCurrentDataset] = useState<EvaluationDataset | null>(null);
  const [datasetCases, setDatasetCases] = useState<EvaluationCase[]>([]);
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [currentRun, setCurrentRun] = useState<EvaluationRun | null>(null);
  const [runResults, setRunResults] = useState<EvaluationCaseResult[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);

      const isAgentEval =
        view[0] === "agents" ||
        (view[0] === "eval" && (!view[1] || view[1] === "overview"));

      if (isAgentEval) {
        const res = await evaluationPreviewStore.getOverview(
          "local-preview",
          "support-assistant"
        );
        if (isMounted && res.status === "ready") {
          setOverviewData(res.data);
        }
      } else if (view[0] === "eval" && view[1] === "datasets") {
        if (view[2] && view[2] !== "new") {
          const res = await evaluationPreviewStore.getDataset(
            "local-preview",
            view[2]
          );
          if (isMounted && res.status === "ready") {
            setCurrentDataset(res.data.dataset);
            setDatasetCases(res.data.cases);
          }
        } else {
          const res = await evaluationPreviewStore.listDatasets("local-preview");
          if (isMounted && res.status === "ready") {
            setDatasets(res.data);
          }
        }
      } else if (view[0] === "eval" && view[1] === "runs") {
        if (view[2]) {
          const res = await evaluationPreviewStore.getRun("local-preview", view[2]);
          if (isMounted && res.status === "ready") {
            setCurrentRun(res.data.run);
            setRunResults(res.data.results);
          }
        } else {
          const res = await evaluationPreviewStore.listRuns("local-preview");
          if (isMounted && res.status === "ready") {
            setRuns(res.data);
          }
        }
      }

      if (isMounted) setLoading(false);
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [view]);

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-[#737373]">
        Loading evaluation sample data…
      </div>
    );
  }

  // 1. Agent Evaluation Overview
  if (
    view[0] === "agents" ||
    (view[0] === "eval" && (!view[1] || view[1] === "overview"))
  ) {
    if (!overviewData) return <div>Failed to load overview data.</div>;
    return (
      <AgentEvaluationPage
        workspaceId="local-preview"
        agentId="support-assistant"
        initialData={overviewData}
        isPreview={true}
      />
    );
  }

  // 2. Datasets
  if (view[0] === "eval" && view[1] === "datasets") {
    // 2a. New dataset
    if (view[2] === "new") {
      return (
        <DatasetForm
          workspaceId="local-preview"
          isPreview={true}
          onSubmit={async (data) => {
            const res = await evaluationPreviewStore.createDataset(
              "local-preview",
              data
            );
            if (res.status === "ready") return res.data;
            return null;
          }}
        />
      );
    }

    // 2b. Dataset detail / editor
    if (view[2]) {
      if (!currentDataset) {
        return (
          <div className="py-12 text-center text-xs text-[#a3a3a3]">
            Dataset "{view[2]}" not found in sample fixtures.
          </div>
        );
      }
      return (
        <DatasetEditor
          workspaceId="local-preview"
          dataset={currentDataset}
          initialCases={datasetCases}
          isPreview={true}
        />
      );
    }

    // 2c. Dataset list
    return (
      <DatasetList
        workspaceId="local-preview"
        datasets={datasets}
        isPreview={true}
        isCompact={false}
      />
    );
  }

  // 3. Runs
  if (view[0] === "eval" && view[1] === "runs") {
    // 3a. Run detail
    if (view[2]) {
      if (!currentRun) {
        return (
          <div className="py-12 text-center text-xs text-[#a3a3a3]">
            Run "{view[2]}" not found in sample fixtures.
          </div>
        );
      }
      return (
        <RunDetail
          workspaceId="local-preview"
          run={currentRun}
          results={runResults}
          isPreview={true}
        />
      );
    }

    // 3b. Run list
    return (
      <RunHistory
        workspaceId="local-preview"
        runs={runs}
        isPreview={true}
        isCompact={false}
      />
    );
  }

  return (
    <div className="py-12 text-center text-xs text-[#a3a3a3]">
      Unknown evaluation view: {view.join("/")}
    </div>
  );
}
