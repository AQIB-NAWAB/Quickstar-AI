import React, { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { PhoneOff } from "lucide-react";
import { CanvasNodeFrame } from "../canvas-node-frame";
import type { CanvasFlowNode } from "../../lib/types";
import type { EndConversationNodeConfig } from "@quickstart/contracts";

export const EndConversationNode: React.FC<NodeProps<CanvasFlowNode>> = memo((props) => {
  const { id, selected, data } = props;
  const config = (data.config as EndConversationNodeConfig) ?? {
    closing_message: "Thank you for contacting us. Goodbye!",
    voice_behavior: "graceful_hangup",
    chat_behavior: "archive_session",
  };

  return (
    <CanvasNodeFrame
      id={id}
      selected={selected}
      title={data.label || "End Conversation"}
      typeBadge="Terminal"
      icon={<PhoneOff className="w-4 h-4" />}
      iconBgColor="bg-red-50 text-red-600"
      hasInput={true}
      hasErrors={data.hasErrors}
      errorMessage={data.errorMessage}
      isExecuting={data.isExecuting}
      onDuplicate={data.onDuplicate ? () => data.onDuplicate!(id) : undefined}
      onDelete={data.onDelete ? () => data.onDelete!(id) : undefined}
      footer={null} // Terminal node - no output ports!
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
          <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-mono">
            {config.voice_behavior || "graceful_hangup"}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-mono">
            {config.chat_behavior || "archive_session"}
          </span>
        </div>

        <p className="text-xs text-neutral-600 bg-neutral-50 p-2 rounded-md border border-neutral-100 line-clamp-2 italic">
          "{config.closing_message || "Thank you. Goodbye!"}"
        </p>
      </div>
    </CanvasNodeFrame>
  );
});

EndConversationNode.displayName = "EndConversationNode";
