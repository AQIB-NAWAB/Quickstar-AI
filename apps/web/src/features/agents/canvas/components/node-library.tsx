"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { NODE_CATEGORIES, NODE_REGISTRY } from "../lib/node-registry";
import type { GraphNodeType } from "@quickstart/contracts";

export type NodeLibraryProps = {
  isOpen: boolean;
  onToggle: () => void;
  onAddNode: (type: GraphNodeType) => void;
};

export const NodeLibrary: React.FC<NodeLibraryProps> = ({ isOpen, onToggle, onAddNode }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNodes = Object.values(NODE_REGISTRY).filter((node) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      node.name.toLowerCase().includes(q) ||
      node.description.toLowerCase().includes(q) ||
      node.category.toLowerCase().includes(q)
    );
  });

  const onDragStart = (event: React.DragEvent, nodeType: GraphNodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="absolute top-16 left-4 z-10 p-2 bg-white border border-neutral-200 rounded-lg shadow-sm hover:bg-neutral-50 text-neutral-600 transition-colors"
        title="Open node library"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="relative h-full w-[208px] shrink-0 bg-white border-r border-neutral-200 z-10 flex flex-col shadow-xs select-none">
      {/* Library Header */}
      <div className="p-3 border-b border-neutral-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-800">Nodes</span>
        <button
          type="button"
          onClick={onToggle}
          className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
          title="Collapse library"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-neutral-100">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search nodes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:border-[#FA5D19] focus:ring-1 focus:ring-[#FA5D19]"
          />
        </div>
      </div>

      {/* Categories & Node Items */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
        {NODE_CATEGORIES.map((cat) => {
          const categoryNodes = filteredNodes.filter((n) => n.category === cat);
          if (categoryNodes.length === 0) return null;

          return (
            <div key={cat} className="space-y-1.5">
              <span className="text-[10px] font-semibold text-neutral-600 tracking-wider uppercase px-1">
                {cat}
              </span>
              <div className="space-y-1">
                {categoryNodes.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.type}
                      role="button"
                      tabIndex={0}
                      aria-label={`Add ${item.name}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onAddNode(item.type);
                        }
                      }}
                      draggable
                      onDragStart={(e) => onDragStart(e, item.type)}
                      onClick={() => onAddNode(item.type)}
                      className="group flex items-center justify-between p-2 rounded-lg border border-transparent bg-white hover:bg-neutral-50 cursor-grab active:cursor-grabbing transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${item.iconBgColor}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-neutral-700 group-hover:text-neutral-900 truncate">
                          {item.name}
                        </span>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-neutral-300 opacity-0 group-hover:opacity-100 group-hover:text-[#FA5D19] shrink-0 transition-colors" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
