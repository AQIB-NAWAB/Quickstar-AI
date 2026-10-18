import React from "react";
import { MiniMap } from "@xyflow/react";

export const CanvasMinimap: React.FC = () => {
  return (
    <div className="absolute bottom-6 right-6 z-10 hidden sm:block">
      <MiniMap
        nodeColor={(node) => {
          if (node.type === "entrypoint") return "#10B981";
          if (node.type === "welcome" || node.type === "response") return "#FA5D19";
          if (node.type === "conversation") return "#2A6DFB";
          if (node.type === "intent_router") return "#9061FF";
          if (node.type === "condition") return "#ECB730";
          if (node.type === "end_conversation") return "#737373";
          return "#6366F1";
        }}
        nodeStrokeWidth={2}
        className="!bg-white/90 !border !border-neutral-200 !rounded-xl !shadow-sm !overflow-hidden !m-0"
        maskColor="rgba(245, 245, 245, 0.6)"
        zoomable
        pannable
      />
    </div>
  );
};
