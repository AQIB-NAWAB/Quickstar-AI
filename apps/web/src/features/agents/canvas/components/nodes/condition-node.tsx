import React, { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { CanvasNodeFrame } from "../canvas-node-frame";
import { CanvasPortRow } from "../canvas-port-row";
import type { CanvasFlowNode } from "../../lib/types";
import type { ConditionNodeConfig } from "@quickstart/contracts";

export const ConditionNode: React.FC<NodeProps<CanvasFlowNode>> = memo((props) => {
  const { id, selected, data } = props;
  const config = (data.config as ConditionNodeConfig) ?? {
    logical_operator: "AND",
    rules: [],
  };

  const rules = config.rules || [];

  return (
    <CanvasNodeFrame
      id={id}
      selected={selected}
      title={data.label || "Condition"}
      typeBadge="Logic"
      icon={<GitBranch className="w-4 h-4" />}
      iconBgColor="bg-amber-50 text-[#ECB730]"
      hasInput={true}
      hasErrors={data.hasErrors}
      errorMessage={data.errorMessage}
      isExecuting={data.isExecuting}
      onDuplicate={data.onDuplicate ? () => data.onDuplicate!(id) : undefined}
      onDelete={data.onDelete ? () => data.onDelete!(id) : undefined}
      footer={
        <div className="flex flex-col divide-y divide-neutral-100">
          <CanvasPortRow id="match" type="source" label="If Condition Matches" badge="True" />
          <CanvasPortRow id="otherwise" type="source" label="Otherwise" badge="False" />
        </div>
      }
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span>
            Combine: <strong className="text-neutral-700">{config.logical_operator}</strong>
          </span>
          <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
            {rules.length} rule{rules.length === 1 ? "" : "s"}
          </span>
        </div>

        {rules.length > 0 ? (
          <div className="space-y-1">
            {rules.slice(0, 2).map((rule, idx) => (
              <div
                key={idx}
                className="text-[11px] bg-neutral-50 border border-neutral-100 p-1.5 rounded text-neutral-700 font-mono truncate"
              >
                {rule.field} {rule.operator} "{String(rule.value ?? "")}"
              </div>
            ))}
            {rules.length > 2 && (
              <span className="text-[10px] text-neutral-400">+{rules.length - 2} more rules</span>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-neutral-400 italic">No rules defined.</div>
        )}
      </div>
    </CanvasNodeFrame>
  );
});

ConditionNode.displayName = "ConditionNode";
