"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  FileText,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Play,
  Trash2,
} from "lucide-react";
import type { Agent } from "../lib/types";
import { DeleteAgentModal } from "./delete-agent-modal";

type Props = {
  agent: Agent;
  workspaceId: string;
  onTestAgent: (agent: Agent) => void;
  onDeleteAgent: (agentId: string) => Promise<boolean>;
};

export function AgentCard({ agent, workspaceId, onTestAgent, onDeleteAgent }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isLive = Boolean(agent.production_version_id);
  const modelName =
    (agent.model_settings?.model_id as string) ||
    (agent.model_settings?.model as string) ||
    "Not configured";

  const channels: string[] = [];
  if (agent.channels?.chat) channels.push("Website chat");
  if (agent.channels?.voice) channels.push("Voice calls");
  const channelsDisplay = channels.length > 0 ? channels.join(", ") : "No channels selected";

  async function handleConfirmDelete() {
    setIsDeleting(true);
    const success = await onDeleteAgent(agent.id);
    setIsDeleting(false);
    if (success) {
      setDeleteModalOpen(false);
    }
  }

  return (
    <>
      <div className="w-full bg-white border border-[#E1E5EA] rounded-[10px] overflow-hidden hover:border-[#CCD2D8] transition-colors shadow-sm">
        {/* Card Header */}
        <div className="px-8 py-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            {/* Peach bot icon tile matching 2.png */}
            <div className="w-[68px] h-[68px] rounded-[10px] bg-[#FFF3ED] border border-[#FCD9C7] flex items-center justify-center p-2.5 shrink-0 text-[#F15A24]">
              <Bot className="w-7 h-7" />
            </div>

            <div className="min-w-0 pt-0.5">
              <h2 className="text-[20px] font-semibold text-[#202125] truncate leading-snug">
                {agent.name}
              </h2>
              <p className="mt-0.5 text-[14px] text-[#667085] truncate leading-normal">
                {agent.description || "No description yet"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#15803D]">
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" aria-hidden="true" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#667085]">
                <span className="w-2 h-2 rounded-full bg-[#98A2B3]" aria-hidden="true" />
                Unpublished
              </span>
            )}

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Agent options"
                aria-expanded={menuOpen}
                className="p-1.5 text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FA] rounded-md transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-44 rounded-lg border border-[#E1E5EA] bg-white py-1 shadow-lg">
                  <Link
                    href={`/workspaces/${workspaceId}/agents/${agent.id}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-[14px] text-[#202125] hover:bg-[#F8F9FA] transition-colors"
                  >
                    Open agent
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-[#B42318] hover:bg-red-50 transition-colors text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete agent
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions Excerpt Band */}
        <div className="bg-[#F8F9FA] px-8 py-5 border-y border-[#EDF0F2] flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold tracking-wider text-[#7A808A] uppercase mb-1">
              Instructions
            </span>
            <p className="text-[14px] text-[#344054] line-clamp-2 leading-relaxed">
              {agent.instructions || "No instructions added."}
            </p>
          </div>
          <FileText className="w-4 h-4 text-[#7A808A] shrink-0 mt-1" aria-hidden="true" />
        </div>

        {/* Metadata Row */}
        <div className="px-8 py-5 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#EDF0F2] gap-3 sm:gap-0">
          <div className="sm:pr-6">
            <span className="text-[12px] font-medium text-[#667085]">Model</span>
            <p className="mt-1 text-[14px] font-mono text-[#202125] truncate">{modelName}</p>
          </div>

          <div className="pt-3 sm:pt-0 sm:px-6">
            <span className="text-[12px] font-medium text-[#667085]">
              {channels.length > 1 ? "Channels" : "Channel"}
            </span>
            <p className="mt-1 text-[14px] font-medium text-[#202125] flex items-center gap-1.5 truncate">
              {agent.channels?.chat && <MessageSquare className="w-3.5 h-3.5 text-[#667085]" />}
              {agent.channels?.voice && <Mic className="w-3.5 h-3.5 text-[#667085]" />}
              <span>{channelsDisplay}</span>
            </p>
          </div>

          <div className="pt-3 sm:pt-0 sm:pl-6">
            <span className="text-[12px] font-medium text-[#667085]">Published version</span>
            <p className="mt-1 text-[14px] font-medium text-[#202125]">
              {isLive ? "Published" : "Unpublished"}
            </p>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-8 py-5 bg-white border-t border-[#EDF0F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] text-[#667085]">
            <FileText className="w-3.5 h-3.5 text-[#667085]" aria-hidden="true" />
            <span>Draft v{agent.version}</span>
            <span className="text-[#CCD2D8]">|</span>
            <span>Publish to update the live agent</span>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => onTestAgent(agent)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-medium text-[#202125] bg-white border border-[#E1E5EA] rounded-[6px] hover:bg-[#F8F9FA] transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current text-[#202125]" />
              Test agent
            </button>

            <Link
              href={`/workspaces/${workspaceId}/agents/${agent.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-medium text-white bg-[#202125] hover:bg-black rounded-[6px] transition-colors"
            >
              Open agent
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <DeleteAgentModal
        isOpen={deleteModalOpen}
        agentName={agent.name}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </>
  );
}
