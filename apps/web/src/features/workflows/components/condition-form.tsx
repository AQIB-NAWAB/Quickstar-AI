"use client";

import { Plus,Trash2 } from "lucide-react";
import type { ConditionGroup,ConditionOperator,ConditionRule } from "../lib/types";

interface ConditionFormProps {
  group: ConditionGroup;
  onChange: (updated: ConditionGroup) => void;
  onRemoveGroup?: () => void;
}

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "exists", label: "exists" },
  { value: "not_exists", label: "does not exist" },
  { value: "greater_than", label: "is greater than" },
  { value: "less_than", label: "is less than" },
];

export function ConditionForm({
  group,
  onChange,
  onRemoveGroup,
}: ConditionFormProps) {
  function handleAddRule() {
    const newRule: ConditionRule = {
      id: `rule-${Date.now()}`,
      field: "message.text",
      operator: "contains",
      value: "",
    };
    onChange({
      ...group,
      rules: [...group.rules, newRule],
    });
  }

  function handleUpdateRule(idx: number, updated: Partial<ConditionRule>) {
    const copy = [...group.rules];
    copy[idx] = { ...copy[idx], ...updated };
    onChange({ ...group, rules: copy });
  }

  function handleRemoveRule(idx: number) {
    const copy = group.rules.filter((_, i) => i !== idx);
    if (copy.length === 0 && onRemoveGroup) {
      onRemoveGroup();
      return;
    }
    onChange({ ...group, rules: copy });
  }

  return (
    <div className="space-y-4 text-xs">
      {/* Logic Selector */}
      <div className="flex items-center justify-between pb-2 border-b border-border-faint">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
            Matching logic
          </label>
          <div className="inline-flex items-center p-0.5 rounded-8 bg-neutral-100 border border-border-faint text-xs">
            <button
              type="button"
              onClick={() => onChange({ ...group, logic: "and" })}
              className={`px-3 py-1 rounded-6 transition-colors ${
                group.logic === "and"
                  ? "bg-white text-accent-black font-semibold shadow-xs"
                  : "text-neutral-500 hover:text-accent-black"
              }`}
            >
              All must match (AND)
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...group, logic: "or" })}
              className={`px-3 py-1 rounded-6 transition-colors ${
                group.logic === "or"
                  ? "bg-white text-accent-black font-semibold shadow-xs"
                  : "text-neutral-500 hover:text-accent-black"
              }`}
            >
              Any may match (OR)
            </button>
          </div>
        </div>

        {onRemoveGroup && (
          <button
            type="button"
            onClick={onRemoveGroup}
            className="text-[11px] text-red-600 hover:text-red-700 font-medium pt-3"
          >
            Remove condition step
          </button>
        )}
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {group.rules.map((rule, idx) => {
          const needsValue = rule.operator !== "exists" && rule.operator !== "not_exists";

          return (
            <div
              key={rule.id}
              className="p-3 rounded-8 bg-neutral-50 border border-border-faint space-y-2 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold text-neutral-400">
                  Rule {idx + 1}
                </span>
                {group.rules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(idx)}
                    className="text-neutral-400 hover:text-red-600 p-1"
                    aria-label={`Remove rule ${idx + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <input
                    type="text"
                    value={rule.field}
                    onChange={(e) => handleUpdateRule(idx, { field: e.target.value })}
                    placeholder="Field path (e.g. message.text)"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-6 border border-neutral-300 focus:outline-none focus:border-heat-100 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={rule.operator}
                    onChange={(e) =>
                      handleUpdateRule(idx, {
                        operator: e.target.value as ConditionOperator,
                      })
                    }
                    className="w-full px-2 py-1.5 text-xs font-mono rounded-6 border border-neutral-300 focus:outline-none focus:border-heat-100 bg-white"
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>

                  {needsValue ? (
                    <input
                      type="text"
                      value={rule.value}
                      onChange={(e) => handleUpdateRule(idx, { value: e.target.value })}
                      placeholder="Comparison value"
                      className="w-full px-2.5 py-1.5 text-xs rounded-6 border border-neutral-300 focus:outline-none focus:border-heat-100 bg-white"
                    />
                  ) : (
                    <div className="flex items-center px-2 text-[11px] text-neutral-400 italic">
                      No value required
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleAddRule}
        className="w-full py-1.5 rounded-8 border border-dashed border-neutral-300 hover:border-neutral-400 text-neutral-600 hover:text-accent-black font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add rule</span>
      </button>

      <p className="text-[11px] text-neutral-400 pt-1">
        If conditions are not satisfied, the execution is marked as <strong>Skipped</strong>.
      </p>
    </div>
  );
}
