import React, { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { GitFork } from "lucide-react";
import { CanvasNodeFrame } from "../canvas-node-frame";
import { CanvasPortRow } from "../canvas-port-row";
import type { CanvasFlowNode } from "../../lib/types";
import type { IntentRouterNodeConfig } from "@quickstart/contracts";

export const IntentRouterNode: React.FC<NodeProps<CanvasFlowNode>> = memo((props) => {
  const { id, selected, data } = props;
  const config = (data.config as IntentRouterNodeConfig) ?? {
    mode: "ai_intent",
    branches: [],
  };

  const branches = config.branches || [];

  return (
    <CanvasNodeFrame
      id={id}
      selected={selected}
      title={data.label || "Intent Router"}
      typeBadge="Router"
      icon={<GitFork className="w-4 h-4" />}
      iconBgColor="bg-amber-50 text-[#ECB730]"
      hasInput={true}
      hasErrors={data.hasErrors}
      errorMessage={data.errorMessage}
      isExecuting={data.isExecuting}
      onDuplicate={data.onDuplicate ? () => data.onDuplicate!(id) : undefined}
      onDelete={data.onDelete ? () => data.onDelete!(id) : undefined}
      footer={
        <div className="flex flex-col divide-y divide-neutral-100">
          {branches.map((b) => (
            <CanvasPortRow
              key={b.id}
              id={`intent_${b.id}`}
              type="source"
              label={b.name}
              badge="Branch"
            />
          ))}
          <CanvasPortRow id="fallback" type="source" label="Fallback" badge="Default" />
        </div>
      }
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span>
            Mode:{" "}
            <strong className="text-neutral-700 capitalize">
              {config.mode === "ai_intent" ? "AI Classification" : "Exact Rules"}
            </strong>
          </span>
          <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium">
            {branches.length} branches
          </span>
        </div>
        <p className="text-[11px] text-neutral-500">
          Routes conversation according to the visitor's detected intent.
        </p>
      </div>
    </CanvasNodeFrame>
  );
});

IntentRouterNode.displayName = "IntentRouterNode";
