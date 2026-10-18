import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { AlertCircle, Copy, MoreHorizontal, Trash2 } from "lucide-react";

export type CanvasNodeFrameProps = {
  id: string;
  selected?: boolean;
  typeBadge?: string;
  title: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  hasInput?: boolean;
  inputPortId?: string;
  hasErrors?: boolean;
  errorMessage?: string;
  isExecuting?: boolean;
  executionStatus?: "running" | "succeeded" | "failed" | "waiting";
  onDuplicate?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export const CanvasNodeFrame: React.FC<CanvasNodeFrameProps> = memo(
  ({
    selected,
    typeBadge,
    title,
    icon,
    iconBgColor = "bg-orange-50 text-[#FA5D19]",
    hasInput = true,
    inputPortId = "in",
    hasErrors,
    errorMessage,
    isExecuting,
    executionStatus,
    onDuplicate,
    onDelete,
    children,
    footer,
    className = "",
  }) => {
    return (
      <div
        className={`relative w-[250px] bg-white rounded-lg border text-neutral-800 transition-all duration-150 shadow-sm ${
          selected
            ? "border-[#FA5D19] ring-1 ring-[#FA5D19]/20"
            : hasErrors
              ? "border-red-400 ring-1 ring-red-400/20"
              : isExecuting
                ? "border-emerald-500 ring-1 ring-emerald-100"
                : "border-neutral-200/90 hover:border-neutral-300"
        } ${className}`}
      >
        {/* Left input handle */}
        {hasInput && (
          <Handle
            type="target"
            position={Position.Left}
            id={inputPortId}
            className="!w-3 !h-3 !-left-1.5 !bg-white !border-2 !border-neutral-400 hover:!border-[#FA5D19] !rounded-full !shadow-xs"
          />
        )}

        {/* Node Header */}
        <div className="flex items-center justify-between p-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm font-medium ${iconBgColor}`}
            >
              {icon}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-[13px] font-semibold text-neutral-900 truncate">{title}</span>
              {typeBadge && (
                <span className="text-[10px] text-neutral-400 font-mono tracking-tight uppercase">
                  {typeBadge}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isExecuting && <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" />}
            {hasErrors && (
              <span title={errorMessage}>
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              </span>
            )}
            {(onDuplicate || onDelete) && (
              <details className="nodrag relative">
                <summary
                  aria-label="Node actions"
                  className="list-none cursor-pointer p-1 text-neutral-400"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </summary>
                <div className="absolute right-0 top-7 z-30 flex gap-2 rounded-md border bg-white p-2 shadow-sm">
                  {" "}
                  {onDuplicate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate();
                      }}
                      className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
                      title="Duplicate node"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete node"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>

        {/* Error message banner */}
        {hasErrors && errorMessage && (
          <div className="bg-red-50/80 px-3 py-1.5 border-b border-red-100 flex items-center gap-1.5 text-[11px] text-red-700">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {/* Node Body Preview */}
        <div className="p-3 text-xs text-neutral-600">{children}</div>

        {/* Node Footer / Output Ports */}
        {footer && (
          <div className="border-t border-neutral-100/80 bg-neutral-50/50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    );
  },
);

CanvasNodeFrame.displayName = "CanvasNodeFrame";
