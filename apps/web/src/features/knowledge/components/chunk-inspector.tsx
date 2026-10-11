"use client";

import { useState } from "react";
import { Info, Layers } from "lucide-react";
import type { KnowledgeSource } from "../lib/types";
import { KNOWLEDGE_CAPABILITIES } from "../lib/capabilities";

interface ChunkInspectorProps {
  source: KnowledgeSource;
  isPreview?: boolean;
}

export function ChunkInspector({ source, isPreview = false }: ChunkInspectorProps) {
  const [selectedChunk, setSelectedChunk] = useState(0);
  const samples = [
    "Unopened items can be returned within 30 days with proof of purchase.",
    "Standard shipping takes 3–5 business days. Tracking details are sent by email.",
    "Contact support with your order number for help with a return or exchange.",
  ];
  if (isPreview && process.env.NODE_ENV === "development") return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500">Sample chunks for the design preview.</p>
      <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-3">
        <nav aria-label="Source chunks" className="rounded-10 border border-border-faint bg-white p-2">
          {samples.map((_, index) => <button type="button" key={index} aria-current={index === selectedChunk ? "true" : undefined} onClick={() => setSelectedChunk(index)} className={`block w-full text-left px-3 py-2 rounded-6 text-xs ${index === selectedChunk ? "bg-heat-12 text-heat-100" : "text-neutral-600 hover:bg-neutral-50"}`}>Chunk {String(index + 1).padStart(2, "0")}</button>)}
        </nav>
        <article className="min-w-0 rounded-10 border border-border-faint bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Chunk {String(selectedChunk + 1).padStart(2, "0")}</h3><span className="text-[11px] font-mono text-neutral-500">chunk_index: {selectedChunk}</span></div>
          <p className="text-xs text-neutral-800">{samples[selectedChunk]}</p>
        </article>
      </div>
    </div>
  );
  // If the backend has no chunk inspection route
  if (!KNOWLEDGE_CAPABILITIES.chunkInspection) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-12 border border-border-faint bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-10 bg-heat-12 text-heat-100 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-accent-black">
                Indexed Chunks
              </p>
              <p className="text-[11px] text-neutral-500">
                Indexed content prepared for retrieval
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-neutral-100 text-neutral-700 border border-border-faint">
            {source.chunk_count} {source.chunk_count === 1 ? "chunk" : "chunks"} reported
          </span>
        </div>

        <div
          role="note"
          className="p-5 rounded-12 border border-border-faint bg-neutral-50 flex items-start gap-3 text-xs text-neutral-600"
        >
          <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-accent-black">
              Chunk inspection is not available yet.
            </p>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              This source reports its chunk count, but individual chunks cannot currently be loaded.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
