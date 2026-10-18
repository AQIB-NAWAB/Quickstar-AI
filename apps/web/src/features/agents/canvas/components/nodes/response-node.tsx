import React, { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { MessageSquareShare } from "lucide-react";
import { CanvasNodeFrame } from "../canvas-node-frame";
import { CanvasPortRow } from "../canvas-port-row";
import type { CanvasFlowNode } from "../../lib/types";
import type { ResponseNodeConfig } from "@quickstart/contracts";

export const ResponseNode: React.FC<NodeProps<CanvasFlowNode>> = memo((props) => {
  const { id, selected, data } = props;
  const config = (data.config as ResponseNodeConfig) ?? {
    content_type: "fixed_text",
    fixed_text: "Thank you for reaching out.",
    wait_for_visitor: false,
    allow_markdown: true,
  };

  return (
    <CanvasNodeFrame
      id={id}
      selected={selected}
      title={data.label || "Response & Speech"}
      typeBadge="Response"
      icon={<MessageSquareShare className="w-4 h-4" />}
      iconBgColor="bg-purple-50 text-[#9061FF]"
      hasInput={true}
      hasErrors={data.hasErrors}
      errorMessage={data.errorMessage}
      isExecuting={data.isExecuting}
      onDuplicate={data.onDuplicate ? () => data.onDuplicate!(id) : undefined}
      onDelete={data.onDelete ? () => data.onDelete!(id) : undefined}
      footer={
        <CanvasPortRow
          id="message_sent"
          type="source"
          label={config.wait_for_visitor ? "On Visitor Reply" : "Continue"}
          badge={config.wait_for_visitor ? "Wait" : "Auto"}
        />
      }
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span className="capitalize">
            {config.content_type === "variable_reference" ? "From Variable" : "Fixed Text"}
          </span>
          <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600">
            {config.wait_for_visitor ? "Waits for user" : "Auto-advance"}
          </span>
        </div>

        {config.content_type === "variable_reference" ? (
          <div className="text-xs font-mono text-neutral-700 bg-neutral-50 p-2 rounded border border-neutral-100">
            {"{{"} {config.variable_name || "ai_output"} {"}}"}
          </div>
        ) : (
          <p className="text-xs text-neutral-700 bg-neutral-50 p-2 rounded-md border border-neutral-100 line-clamp-3">
            {config.fixed_text || "No response message entered"}
          </p>
        )}
      </div>
    </CanvasNodeFrame>
  );
});

ResponseNode.displayName = "ResponseNode";
