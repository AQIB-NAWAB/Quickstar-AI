import React, { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { MessageSquareText } from "lucide-react";
import { CanvasNodeFrame } from "../canvas-node-frame";
import { CanvasPortRow } from "../canvas-port-row";
import type { CanvasFlowNode } from "../../lib/types";
import type { ConversationNodeConfig } from "@quickstart/contracts";

export const ConversationNode: React.FC<NodeProps<CanvasFlowNode>> = memo((props) => {
  const { id, selected, data } = props;
  const config = (data.config as ConversationNodeConfig) ?? {
    instructions: "Capture visitor details",
    capture_fields: [],
  };

  return (
    <CanvasNodeFrame
      id={id}
      selected={selected}
      title={data.label || "Conversation"}
      typeBadge="Capture"
      icon={<MessageSquareText className="w-4 h-4" />}
      iconBgColor="bg-purple-50 text-[#9061FF]"
      hasInput={true}
      hasErrors={data.hasErrors}
      errorMessage={data.errorMessage}
      isExecuting={data.isExecuting}
      onDuplicate={data.onDuplicate ? () => data.onDuplicate!(id) : undefined}
      onDelete={data.onDelete ? () => data.onDelete!(id) : undefined}
      footer={
        <div className="flex flex-col divide-y divide-neutral-100">
          <CanvasPortRow
            id="details_complete"
            type="source"
            label="Details Collected"
            badge="Success"
          />
          <CanvasPortRow
            id="needs_assistance"
            type="source"
            label="Help Needed / Fallback"
            badge="Assistance"
          />
        </div>
      }
    >
      <div className="space-y-2">
        <p className="text-xs text-neutral-600 line-clamp-2">
          {config.instructions || "No specific instructions provided."}
        </p>

        {config.capture_fields && config.capture_fields.length > 0 ? (
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
              Fields to Capture ({config.capture_fields.length})
            </span>
            <div className="flex flex-wrap gap-1">
              {config.capture_fields.map((f) => (
                <span
                  key={f.field_name}
                  className="px-1.5 py-0.5 text-[10px] bg-blue-50 border border-blue-100 text-blue-700 rounded flex items-center gap-1 font-mono"
                >
                  {f.field_name}
                  {f.required && <span className="text-red-500 font-bold">*</span>}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-neutral-400 italic">
            No fields configured to capture.
          </div>
        )}
      </div>
    </CanvasNodeFrame>
  );
});

ConversationNode.displayName = "ConversationNode";
