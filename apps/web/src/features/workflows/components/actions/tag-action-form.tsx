"use client";

import { X } from "lucide-react";
import React,{ useState } from "react";
import type { UpdateTagsActionConfig } from "../../lib/types";

interface TagActionFormProps {
  config: UpdateTagsActionConfig;
  onChange: (updated: UpdateTagsActionConfig) => void;
}

export function TagActionForm({ config, onChange }: TagActionFormProps) {
  const [tagInput, setTagInput] = useState("");

  function handleAddTag(val: string) {
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return;
    if (config.tags.includes(trimmed)) {
      setTagInput("");
      return;
    }
    onChange({
      ...config,
      tags: [...config.tags, trimmed],
    });
    setTagInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    onChange({
      ...config,
      tags: config.tags.filter((t) => t !== tagToRemove),
    });
  }

  return (
    <div className="space-y-4 text-xs">

      {/* Target Resource */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
          Target resource
        </label>
        <select
          value={config.targetResource}
          onChange={(e) =>
            onChange({
              ...config,
              targetResource: e.target.value as "conversation" | "lead",
            })
          }
          className="w-full px-3 py-1.5 text-xs rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
        >
          <option value="conversation">Conversation thread</option>
          <option value="lead">Qualified lead</option>
        </select>
      </div>

      {/* Operation */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
          Operation
        </label>
        <select
          value={config.operation}
          onChange={(e) =>
            onChange({
              ...config,
              operation: e.target.value as "add" | "remove",
            })
          }
          className="w-full px-3 py-1.5 text-xs rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
        >
          <option value="add">Add tags</option>
          <option value="remove">Remove tags</option>
        </select>
      </div>

      {/* Tags chips input */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
          Tags (press Enter to add)
        </label>
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-8 border border-neutral-300 bg-white min-h-[42px] focus-within:border-heat-100 focus-within:ring-1 focus-within:ring-heat-100">
          {config.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="text-neutral-400 hover:text-neutral-700 p-0.5"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => handleAddTag(tagInput)}
            placeholder={config.tags.length === 0 ? "Type a tag..." : ""}
            className="flex-1 min-w-[80px] bg-transparent text-xs text-accent-black focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
