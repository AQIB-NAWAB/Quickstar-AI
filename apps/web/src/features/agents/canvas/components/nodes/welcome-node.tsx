import React, { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Sparkles } from "lucide-react";
import { CanvasNodeFrame } from "../canvas-node-frame";
import { CanvasPortRow } from "../canvas-port-row";
import type { CanvasFlowNode } from "../../lib/types";
import type { WelcomeNodeConfig } from "@quickstart/contracts";

export const WelcomeNode: React.FC<NodeProps<CanvasFlowNode>> = memo((props) => {
  const { id, selected, data } = props;
  const config = (data.config as WelcomeNodeConfig) ?? {
    message_mode: "fixed",
    fixed_text: "Welcome! How can I help you today?",
  };

  return (
    <CanvasNodeFrame
      id={id}
      selected={selected}
      title={data.label || "Welcome Greeting"}
      typeBadge="Welcome"
      icon={<Sparkles className="w-4 h-4" />}
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
          label={config.transition === "wait_for_input" ? "On Visitor Reply" : "Continue"}
          badge={config.transition === "wait_for_input" ? "Wait" : "Auto"}
        />
      }
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span className="capitalize">
            {config.message_mode === "ai_generated" ? "AI Generated" : "Fixed Message"}
          </span>
          <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600">
            {config.transition === "wait_for_input" ? "Waits for user" : "Auto-advance"}
          </span>
        </div>
        <p className="text-xs text-neutral-700 bg-neutral-50 p-2 rounded-md border border-neutral-100 line-clamp-3 italic">
          "{config.fixed_text || config.ai_prompt || "No greeting text configured"}"
        </p>
      </div>
    </CanvasNodeFrame>
  );
});

WelcomeNode.displayName = "WelcomeNode";
