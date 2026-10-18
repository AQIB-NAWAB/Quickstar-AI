"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { NODE_CATEGORIES, NODE_REGISTRY } from "../lib/node-registry";
import type { GraphNodeType } from "@quickstart/contracts";

export type AddNodeMenuProps = {
  isOpen: boolean;
  position: { x: number; y: number };
  originatingPort?: { nodeId: string; portId: string; portLabel?: string } | null;
  hasExistingEntrypoint?: boolean;
  onSelectNode: (type: GraphNodeType) => void;
  onClose: () => void;
};

export const AddNodeMenu: React.FC<AddNodeMenuProps> = ({
  isOpen,
  position,
  originatingPort,
  hasExistingEntrypoint,
  onSelectNode,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNodes = Object.values(NODE_REGISTRY).filter((node) => {
    // Hide additional entrypoints when one already exists
    if (hasExistingEntrypoint && node.type === "entrypoint") return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      node.name.toLowerCase().includes(q) ||
      node.description.toLowerCase().includes(q) ||
      node.category.toLowerCase().includes(q)
    );
  });

  return (
    <div
      ref={containerRef}
      style={{ left: position.x, top: position.y }}
      className="fixed z-50 w-72 bg-white rounded-xl border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-2.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
        <div className="min-w-0">
          <span className="text-xs font-semibold text-neutral-800 block">Add Next Step</span>
          {originatingPort && (
            <span className="text-[10px] text-neutral-500 truncate block">
              Connecting from: {originatingPort.portLabel || originatingPort.portId}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-neutral-100">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search action or node..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:border-[#FA5D19] focus:ring-1 focus:ring-[#FA5D19]"
          />
        </div>
      </div>

      {/* Node List */}
      <div className="max-h-72 overflow-y-auto p-2 space-y-3">
        {NODE_CATEGORIES.map((cat) => {
          const categoryNodes = filteredNodes.filter((n) => n.category === cat);
          if (categoryNodes.length === 0) return null;

          return (
            <div key={cat} className="space-y-1">
              <span className="text-[10px] font-semibold text-neutral-400 tracking-wider uppercase px-1">
                {cat}
              </span>
              <div className="space-y-0.5">
                {categoryNodes.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => onSelectNode(item.type)}
                      className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left hover:bg-neutral-50 transition-colors group"
                    >
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5 ${item.iconBgColor}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-neutral-800 group-hover:text-[#FA5D19] transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-neutral-500 line-clamp-1">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredNodes.length === 0 && (
          <div className="p-4 text-center text-xs text-neutral-400">No matching nodes found.</div>
        )}
      </div>
    </div>
  );
};
