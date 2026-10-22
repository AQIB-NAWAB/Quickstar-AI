import React, { useRef } from "react";
import { Calendar, BookOpen, Headphones, Plus, GitBranch, Grid2X2, ArrowRight } from "lucide-react";
import { STARTER_TEMPLATES, BLANK_GRAPH } from "../lib/templates";
import type { AgentGraph } from "@quickstart/contracts";
export type CanvasEmptyStateProps = { onSelectGraph: (graph: AgentGraph) => void };
const icons = [Calendar, BookOpen, Headphones];
export const CanvasEmptyState: React.FC<CanvasEmptyStateProps> = ({ onSelectGraph }) => {
  const templates = useRef<HTMLDivElement>(null);
  return (
    <div className="absolute inset-0 z-10 overflow-y-auto flex items-center justify-center px-6 py-12 pointer-events-none">
      <div className="w-full max-w-[900px] text-center pointer-events-auto">
        <div className="mx-auto w-14 h-14 rounded-xl bg-[#FA5D19]/10 text-[#FA5D19] flex items-center justify-center mb-5">
          <GitBranch className="w-8 h-8" />
        </div>
        <h1 className="text-[26px] font-bold tracking-tight">Build your agent’s first flow</h1>
        <p className="text-sm text-neutral-500 leading-relaxed max-w-[520px] mx-auto mt-3">
          Create a conversation step by step. Start with an entrypoint, or use a template and make
          it your own.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button
            className="h-11 px-5 rounded-lg bg-[#FA5D19] text-white text-sm font-semibold flex gap-2 items-center"
            onClick={() => onSelectGraph(structuredClone(BLANK_GRAPH))}
          >
            <Plus className="w-4 h-4" />
            Start from scratch
          </button>
          <button
            className="h-11 px-5 rounded-lg bg-white border border-[#EDEDED] text-sm font-semibold flex gap-2 items-center"
            onClick={() =>
              templates.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
            }
          >
            <Grid2X2 className="w-4 h-4" />
            Browse templates
          </button>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Start from scratch adds an Incoming interaction node.
        </p>
        <div className="flex items-center gap-5 text-[10px] text-neutral-500 tracking-wider my-8">
          <span className="flex-1 border-t border-[#EDEDED]" />
          OR START WITH A TEMPLATE
          <span className="flex-1 border-t border-[#EDEDED]" />
        </div>
        <div ref={templates} className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
          {STARTER_TEMPLATES.map((t, i) => {
            const Icon = icons[i];
            return (
              <button
                key={t.id}
                onClick={() => onSelectGraph(structuredClone(t.graph))}
                className="flex flex-col rounded-xl border border-[#EDEDED] bg-white p-5 hover:border-[#FA5D19] focus-visible:outline-[#FA5D19] min-h-[220px] text-left"
              >
                <div className="flex items-center gap-4 mb-6 text-neutral-300">
                  <span
                    className={`p-3 rounded-lg ${i === 0 ? "text-[#FA5D19] bg-orange-50" : i === 1 ? "text-blue-600 bg-blue-50" : "text-emerald-600 bg-emerald-50"}`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <ArrowRight className="w-5 h-5" />
                  <span className="w-10 h-8 rounded border bg-neutral-50" />
                  <ArrowRight className="w-5 h-5" />
                  <span className="w-10 h-8 rounded border bg-neutral-50" />
                </div>
                <h2 className="text-sm font-semibold">{t.name}</h2>
                <p className="text-xs text-neutral-500 leading-relaxed mt-2 mb-5">
                  {t.description}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-[11px] bg-neutral-50 rounded px-2 py-1 text-neutral-500">
                    Chat + Voice
                  </span>
                  <span className="text-xs text-[#FA5D19]">Use template →</span>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-neutral-500">
          You can change every node and setting later.
        </p>
      </div>
    </div>
  );
};
