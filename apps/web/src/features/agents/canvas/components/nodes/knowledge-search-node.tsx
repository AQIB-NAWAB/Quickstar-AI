import React, { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { BookOpen } from "lucide-react";
import { CanvasNodeFrame } from "../canvas-node-frame";
import { CanvasPortRow } from "../canvas-port-row";
import type { CanvasFlowNode } from "../../lib/types";
import type { KnowledgeSearchNodeConfig } from "@quickstart/contracts";

export const KnowledgeSearchNode: React.FC<NodeProps<CanvasFlowNode>> = memo((props) => {
  const { id, selected, data } = props;
  const config = (data.config as KnowledgeSearchNodeConfig) ?? {
    source_ids: [],
    query_variable: "visitor_message",
    max_results: 3,
  };

  const sourcesCount = config.source_ids?.length || 0;
  const isConfigured = sourcesCount > 0;

  return (
    <CanvasNodeFrame
      id={id}
      selected={selected}
      title={data.label || "Knowledge Search"}
      typeBadge="Knowledge"
      icon={<BookOpen className="w-4 h-4" />}
      iconBgColor="bg-blue-50 text-[#2A6DFB]"
      hasInput={true}
      hasErrors={data.hasErrors || !isConfigured}
      errorMessage={
        data.errorMessage || (!isConfigured ? "Select workspace knowledge sources" : undefined)
      }
      isExecuting={data.isExecuting}
      onDuplicate={data.onDuplicate ? () => data.onDuplicate!(id) : undefined}
      onDelete={data.onDelete ? () => data.onDelete!(id) : undefined}
      footer={
        <div className="flex flex-col divide-y divide-neutral-100">
          <CanvasPortRow id="results_found" type="source" label="Articles Found" badge="Match" />
          <CanvasPortRow id="no_matches" type="source" label="No Matches Found" badge="Empty" />
          <CanvasPortRow id="failure" type="source" label="Search Error" badge="Error" />
        </div>
      }
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span>Sources:</span>
          <span className="font-medium text-neutral-700">
            {sourcesCount > 0
              ? `${sourcesCount} source${sourcesCount > 1 ? "s" : ""}`
              : "None selected"}
          </span>
        </div>

        <div className="text-[11px] text-neutral-600">
          Query:{" "}
          <span className="font-mono text-neutral-800 bg-neutral-100 px-1 py-0.5 rounded">
            {"{{"} {config.query_variable || "visitor_message"} {"}}"}
          </span>
        </div>

        <div className="text-[10px] text-neutral-500 flex justify-between pt-1 border-t border-neutral-100">
          <span>Store results in:</span>
          <span className="font-mono text-teal-700">
            {"{{"} {config.output_variable || "search_context"} {"}}"}
          </span>
        </div>
      </div>
    </CanvasNodeFrame>
  );
});

KnowledgeSearchNode.displayName = "KnowledgeSearchNode";
