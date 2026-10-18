"use client";
import React from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { Hand, MousePointer2, Maximize, Minus, Plus } from "lucide-react";
export type CanvasControlsProps = { snapToGrid?: boolean; onToggleSnap?: () => void };
export const CanvasControls: React.FC<CanvasControlsProps> = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1 p-1 rounded-lg bg-white border border-[#EDEDED] shadow-sm text-neutral-700">
      <span title="Select nodes" className="p-2 bg-[#FA5D19]/10 rounded">
        <MousePointer2 className="w-4 h-4" />
      </span>
      <span title="Drag empty canvas to pan" className="p-2">
        <Hand className="w-4 h-4" />
      </span>
      <span className="h-5 border-l mx-1" />
      <button
        aria-label="Zoom out"
        onClick={() => void zoomOut()}
        className="p-2 hover:bg-neutral-50 rounded"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="text-xs tabular-nums min-w-10 text-center">{Math.round(zoom * 100)}%</span>
      <button
        aria-label="Zoom in"
        onClick={() => void zoomIn()}
        className="p-2 hover:bg-neutral-50 rounded"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        aria-label="Fit View"
        onClick={() => void fitView({ padding: 0.15, duration: 200 })}
        className="p-2 hover:bg-neutral-50 rounded"
      >
        <Maximize className="w-4 h-4" />
      </button>
    </div>
  );
};
