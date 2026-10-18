import React from "react";
import { Handle, Position } from "@xyflow/react";

export type CanvasPortProps = {
  id: string;
  type: "source" | "target";
  position?: Position;
  label?: string;
  badge?: string;
  color?: string;
  className?: string;
};

export const CanvasPortRow: React.FC<CanvasPortProps> = ({
  id,
  type,
  position = type === "source" ? Position.Right : Position.Left,
  label,
  badge,
  className = "",
}) => {
  return (
    <div
      className={`relative flex items-center justify-between py-1.5 px-3 text-xs text-neutral-600 hover:text-neutral-900 transition-colors ${className}`}
    >
      <div className="flex items-center gap-1.5 truncate">
        {label && <span className="font-medium truncate">{label}</span>}
        {badge && (
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-neutral-100 text-neutral-500 font-mono">
            {badge}
          </span>
        )}
      </div>

      <Handle
        type={type}
        position={position}
        id={id}
        className="!w-2.5 !h-2.5 !bg-white !border-2 !border-neutral-400 hover:!border-[#FA5D19] hover:!scale-125 !transition-all !rounded-full !shadow-xs"
      />
    </div>
  );
};
