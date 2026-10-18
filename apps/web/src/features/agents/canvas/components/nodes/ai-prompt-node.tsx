import React, { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Cpu } from "lucide-react";
import { CanvasNodeFrame } from "../canvas-node-frame";
import { CanvasPortRow } from "../canvas-port-row";
import type { CanvasFlowNode } from "../../lib/types";
import type { AiPromptNodeConfig } from "@quickstart/contracts";

export const AiPromptNode: React.FC<NodeProps<CanvasFlowNode>> = memo((props) => {
  const { id, selected, data } = props;
  const config = (data.config as AiPromptNodeConfig) ?? {
    model_profile: "openai:gpt-4o",
    system_prompt: "",
    output_variable: "ai_output",
  };

  return (
    <CanvasNodeFrame
      id={id}
      selected={selected}
      title={data.label || "AI & Prompt"}
      typeBadge="Prompt"
      icon={<Cpu className="w-4 h-4" />}
      iconBgColor="bg-purple-50 text-[#9061FF]"
      hasInput={true}
      hasErrors={data.hasErrors}
      errorMessage={data.errorMessage}
      isExecuting={data.isExecuting}
      onDuplicate={data.onDuplicate ? () => data.onDuplicate!(id) : undefined}
      onDelete={data.onDelete ? () => data.onDelete!(id) : undefined}
      footer={
        <div className="flex flex-col divide-y divide-neutral-100">
          <CanvasPortRow id="success" type="source" label="On Complete" badge="Success" />
          <CanvasPortRow id="failure" type="source" label="On Failure" badge="Error" />
        </div>
      }
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span>Model:</span>
          <span className="font-mono text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700">
            {config.model_profile || "Inherited default"}
          </span>
        </div>

        <p className="text-xs text-neutral-600 line-clamp-2">
          {config.system_prompt || "No custom instructions specified."}
        </p>

        <div className="pt-1 flex items-center justify-between text-[10px] text-neutral-500 border-t border-neutral-100">
          <span>Save output to:</span>
          <span className="font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
            {config.output_variable ? `{{ ${config.output_variable} }}` : "None"}
          </span>
        </div>
      </div>
    </CanvasNodeFrame>
  );
});

AiPromptNode.displayName = "AiPromptNode";
