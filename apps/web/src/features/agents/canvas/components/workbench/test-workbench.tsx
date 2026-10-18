"use client";
import React from "react";
import { Play, X } from "lucide-react";
import { ChatWorkbench, type ChatMessageItem } from "./chat-workbench";
import { VoiceWorkbench } from "./voice-workbench";
import type { GraphExecutionTrace, GraphSessionState } from "@quickstart/contracts";
import type { WorkbenchTab } from "../../lib/types";
export type TestWorkbenchProps = {
  isOpen: boolean;
  onClose: () => void;
  activeTab: WorkbenchTab;
  onTabChange: (tab: WorkbenchTab) => void;
  draftRevision: number;
  messages: ChatMessageItem[];
  sessionState: GraphSessionState | null;
  activeTrace: GraphExecutionTrace | null;
  isLoading: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onResetSession: () => Promise<void>;
  onSelectNode?: (nodeId: string) => void;
};
export const TestWorkbench: React.FC<TestWorkbenchProps> = (p) => {
  if (!p.isOpen) return null;
  return (
    <aside
      aria-label="Test workbench"
      className="absolute inset-y-0 right-0 lg:relative w-[400px] max-w-[92vw] shrink-0 border-l border-[#EDEDED] bg-white flex flex-col z-30 min-h-0"
    >
      <div className="h-16 px-5 flex items-center justify-between shrink-0">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Play className="w-4 h-4" />
          Test workbench
        </h2>
        <button
          onClick={p.onClose}
          aria-label="Close workbench"
          className="p-2 rounded hover:bg-neutral-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div
        className="flex border-b border-[#EDEDED] px-4"
        role="tablist"
        aria-label="Preview channel"
      >
        {(["chat", "voice"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={p.activeTab === tab}
            disabled={p.isLoading}
            onClick={() => p.onTabChange(tab)}
            className={`flex-1 py-3 text-[13px] border-b-2 ${p.activeTab === tab ? "border-[#FA5D19] text-[#262626]" : "border-transparent text-neutral-500"}`}
          >
            {tab === "chat" ? "Chat" : "Voice"}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        {p.activeTab === "chat" ? (
          <ChatWorkbench {...p} />
        ) : (
          <VoiceWorkbench
            draftRevision={p.draftRevision}
            sessionState={p.sessionState}
            onSendMessage={p.onSendMessage}
            onResetSession={p.onResetSession}
            messages={p.messages}
            isLoading={p.isLoading}
          />
        )}
      </div>
    </aside>
  );
};
