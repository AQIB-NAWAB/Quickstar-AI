"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { AlertCircle, Copy, Trash2 } from "lucide-react";

export type WorkflowNodeFrameProps = {
  id: string;
  selected?: boolean;
  typeBadge?: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  hasInput?: boolean;
  inputPortId?: string;
  hasErrors?: boolean;
  errorMessage?: string;
  isExecuting?: boolean;
  executionStatus?: "running" | "succeeded" | "failed" | "skipped";
  onDuplicate?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export const WorkflowNodeFrame: React.FC<WorkflowNodeFrameProps> = memo(
  ({
    selected,
    typeBadge,
    title,
    subtitle,
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
        className={`relative w-[230px] bg-white rounded-xl border text-neutral-800 transition-all duration-150 shadow-sm ${
          selected
            ? "border-[#FA5D19] ring-1 ring-[#FA5D19]/10 shadow-sm"
            : hasErrors
              ? "border-red-400 ring-2 ring-red-400/20"
              : isExecuting
                ? "border-emerald-500 ring-2 ring-emerald-200"
                : executionStatus === "succeeded"
                  ? "border-emerald-300 ring-1 ring-emerald-100"
                  : executionStatus === "failed"
                    ? "border-rose-400 ring-1 ring-rose-100"
                    : executionStatus === "skipped"
                      ? "border-neutral-300 opacity-70"
                      : "border-neutral-200 hover:border-neutral-300 hover:shadow"
        } ${className}`}
      >
        {/* Left input handle */}
        {hasInput && (
          <Handle
            type="target"
            position={Position.Left}
            id={inputPortId}
            className="!w-3.5 !h-3.5 !-left-2 !bg-white !border-2 !border-neutral-400 hover:!border-[#FA5D19] !rounded-full !shadow-xs transition-colors"
          />
        )}

        {/* Node Header */}
        <div className="flex items-center justify-between p-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base font-medium ${iconBgColor}`}
            >
              {icon}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-[13px] font-semibold text-neutral-900 truncate leading-tight">
                {title}
              </span>
              {subtitle ? (
                <span className="text-[11px] text-neutral-500 truncate leading-normal">
                  {subtitle}
                </span>
              ) : typeBadge ? (
                <span className="text-[10px] text-neutral-400 font-mono tracking-tight uppercase">
                  {typeBadge}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
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
                className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                title="Delete node"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Error notification banner */}
        {hasErrors && errorMessage && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border-b border-rose-100 text-rose-700 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {/* Node Body */}
        <div className="p-3 space-y-2">{children}</div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-3.5 py-2.5 bg-neutral-50/70 border-t border-neutral-100 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    );
  },
);

WorkflowNodeFrame.displayName = "WorkflowNodeFrame";
