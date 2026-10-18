"use client";

import React from "react";
import { Sliders, X, Trash2, Bot } from "lucide-react";
import { NodeInspector } from "./node-inspector";
import { AgentInspector } from "./agent-inspector";
import type { CanvasFlowNode, InspectorTab } from "../../lib/types";
import type { GraphValidationIssue } from "@quickstart/contracts";

export type InspectorPanelProps = {
  isOpen: boolean;
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  onClose: () => void;
  selectedNode: CanvasFlowNode | null;
  validationIssues?: GraphValidationIssue[];
  onUpdateNodeLabel: (nodeId: string, label: string) => void;
  onUpdateNodeConfig: (nodeId: string, config: any) => void;
  onDeleteNode?: (nodeId: string) => void;
  saveState?: string;
  workspaceId?: string;
  tools?: import("@quickstart/contracts").AgentToolDefinition[];
  nodes?: { id: string; name: string; type: import("@quickstart/contracts").GraphNodeType }[];
  targets?: Record<string, string>;
  onChangeTarget?: (port: string, target: string) => void;
  instructions: string;
  onChangeInstructions: (value: string) => void;
  modelSettings: Record<string, unknown>;
  onChangeModelSettings: (value: Record<string, unknown>) => void;
  // Agent-wide settings
  agentName: string;
  channels: { chat: boolean; voice: boolean };
  onChangeChannels: (channels: { chat: boolean; voice: boolean }) => void;
  voiceSettings?: any;
  onChangeVoiceSettings?: (settings: any) => void;
};

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  selectedNode,
  validationIssues = [],
  onUpdateNodeLabel,
  onUpdateNodeConfig,
  onDeleteNode,
  agentName,
  channels,
  onChangeChannels,
  voiceSettings,
  onChangeVoiceSettings,
  instructions,
  onChangeInstructions,
  modelSettings,
  onChangeModelSettings,
  saveState,
  workspaceId,
  tools,
  nodes,
  targets,
  onChangeTarget,
}) => {
  if (!isOpen) return null;

  const nodeIssues = selectedNode
    ? validationIssues.filter((i) => i.node_id === selectedNode.id)
    : [];

  return (
    <aside className="absolute inset-y-0 right-0 lg:relative w-[400px] max-w-[90vw] shrink-0 bg-white border-l border-neutral-200 z-10 flex flex-col shadow-sm select-none">
      {/* Inspector Header & Tabs */}
      <div className="border-b border-neutral-200 shrink-0">
        <div className="hidden">
          <span className="text-xs font-bold text-neutral-800 tracking-wide uppercase">
            Inspector
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
            title="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-5 gap-6 pt-5 text-[13px] font-semibold">
          <button
            type="button"
            onClick={() => onTabChange("node")}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "node"
                ? "border-[#FA5D19] text-[#FA5D19]"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Node settings</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("agent")}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "agent"
                ? "border-[#FA5D19] text-[#FA5D19]"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Agent settings</span>
          </button>
        </div>
      </div>

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "node" ? (
          selectedNode ? (
            <div className="space-y-4">
              {nodeIssues.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  <span className="text-xs font-bold text-red-700 block">Configuration Issues</span>
                  {nodeIssues.map((issue, idx) => (
                    <p key={idx} className="text-xs text-red-600">
                      • {issue.message}
                    </p>
                  ))}
                </div>
              )}

              <NodeInspector
                key={selectedNode.id}
                workspaceId={workspaceId}
                tools={tools}
                nodes={nodes}
                targets={targets}
                onChangeTarget={onChangeTarget}
                nodeId={selectedNode.id}
                nodeType={selectedNode.data.type}
                nodeLabel={selectedNode.data.label}
                config={selectedNode.data.config}
                onChangeLabel={(label) => onUpdateNodeLabel(selectedNode.id, label)}
                onChangeConfig={(config) => onUpdateNodeConfig(selectedNode.id, config)}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
              <Sliders className="w-8 h-8 mb-2 stroke-1" />
              <p className="text-xs font-medium text-neutral-600">No node selected</p>
              <p className="text-[11px] text-neutral-400 mt-1 max-w-[200px]">
                Click on any node in the canvas to view and edit its parameters.
              </p>
            </div>
          )
        ) : (
          <AgentInspector
            workspaceId={workspaceId}
            agentName={agentName}
            channels={channels}
            onChangeChannels={onChangeChannels}
            voiceSettings={voiceSettings}
            onChangeVoiceSettings={onChangeVoiceSettings}
            instructions={instructions}
            onChangeInstructions={onChangeInstructions}
            modelSettings={modelSettings}
            onChangeModelSettings={onChangeModelSettings}
          />
        )}
      </div>

      {/* Stable Footer */}
      {activeTab === "node" && selectedNode && onDeleteNode && (
        <div className="p-3 border-t border-neutral-100 bg-neutral-50/50 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-neutral-400 font-mono">
            {saveState === "saved"
              ? "✓ Saved to draft"
              : saveState === "saving"
                ? "Saving…"
                : "Unsaved changes"}
          </span>
          <button
            type="button"
            onClick={() => onDeleteNode(selectedNode.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete node</span>
          </button>
        </div>
      )}
    </aside>
  );
};
