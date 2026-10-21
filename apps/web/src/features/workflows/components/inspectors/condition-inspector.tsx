"use client";
import React, { useState } from "react";
import { GitBranch, X, Trash2, Play } from "lucide-react";
import type { WorkflowNode, WorkflowGraph } from "../../lib/types";
import { evaluateConditionGroup } from "../../lib/condition-evaluator";
type Rule = { id: string; field: string; operator: string; value: string };
type Group = { id: string; logic: "and" | "or"; children: Array<Rule | Group> };
function canonical(g: any): Group {
  return {
    id: g?.id ?? crypto.randomUUID(),
    logic: g?.logic ?? "and",
    children: (g?.children ?? [...(g?.rules ?? []), ...(g?.groups ?? [])]).map((c: any) =>
      "logic" in c ? canonical(c) : c,
    ),
  };
}
const field =
  "min-w-0 rounded-md border border-neutral-200 bg-white px-2 py-2 text-xs outline-none focus:border-[#FA5D19]";
export type ConditionInspectorProps = {
  node: WorkflowNode;
  onUpdateConfig: (c: Record<string, any>) => void;
  onUpdateName: (s: string) => void;
  onClose: () => void;
  onOpenVariablePicker?: (cb: (path: string) => void) => void;
  samplePayload?: Record<string, unknown>;
  graph?: WorkflowGraph;
  onRoute?: (port: "matched" | "not_matched", target: string) => void;
};
export function ConditionInspector({
  node,
  onUpdateConfig: update,
  onUpdateName,
  onClose,
  samplePayload,
  graph,
  onRoute,
}: ConditionInspectorProps) {
  const c = node.config as Record<string, any>,
    root = canonical(c.root_group),
    [evaluated, setEvaluated] = useState(false);
  const sample = samplePayload ?? { message: { text: "I need a refund", sender_type: "user" } };
  const result = evaluateConditionGroup(root, sample, {
    caseSensitive: c.case_sensitive ?? false,
    missingValueBehavior: "treat_as_false",
  });
  function group(g: Group, change: (g: Group) => void, depth = 1): React.ReactNode {
    return (
      <div className="space-y-3 rounded-lg border border-neutral-200 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">Match</span>
          <select
            aria-label={`Group ${g.id} logic`}
            className={field}
            value={g.logic}
            onChange={(e) => change({ ...g, logic: e.target.value as "and" | "or" })}
          >
            <option value="and">ALL · AND</option>
            <option value="or">ANY · OR</option>
          </select>
        </div>
        {g.children.map((child, i) => (
          <div key={child.id} className="flex min-w-0 items-start gap-1">
            {"logic" in child ? (
              <div className="min-w-0 flex-1 border-l-2 border-orange-100 pl-2">
                {group(
                  child,
                  (next) =>
                    change({ ...g, children: g.children.map((v, j) => (j === i ? next : v)) }),
                  depth + 1,
                )}
              </div>
            ) : (
              <div className="grid min-w-0 flex-1 grid-cols-[1.1fr_1fr_1fr] gap-1">
                {["field", "operator", "value"].map((key) =>
                  key === "operator" ? (
                    <select
                      key={key}
                      aria-label="Rule operator"
                      className={field}
                      value={child.operator}
                      onChange={(e) =>
                        change({
                          ...g,
                          children: g.children.map((v, j) =>
                            j === i ? { ...child, operator: e.target.value } : v,
                          ),
                        })
                      }
                    >
                      {[
                        "contains",
                        "not_contains",
                        "equals",
                        "not_equals",
                        "exists",
                        "not_exists",
                        "greater_than",
                        "less_than",
                      ].map((op) => (
                        <option key={op} value={op}>
                          {op.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      key={key}
                      aria-label={key === "field" ? "Variable path" : "Comparison value"}
                      className={field + " font-mono"}
                      disabled={
                        key === "value" && ["exists", "not_exists"].includes(child.operator)
                      }
                      value={child[key as "field" | "value"]}
                      onChange={(e) =>
                        change({
                          ...g,
                          children: g.children.map((v, j) =>
                            j === i ? { ...child, [key]: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  ),
                )}
              </div>
            )}
            <button
              aria-label="Remove condition"
              className="p-2 text-neutral-400"
              onClick={() => change({ ...g, children: g.children.filter((_, j) => j !== i) })}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <button
            className={field}
            onClick={() =>
              change({
                ...g,
                children: [
                  ...g.children,
                  {
                    id: crypto.randomUUID(),
                    field: "message.text",
                    operator: "contains",
                    value: "",
                  },
                ],
              })
            }
          >
            + Add rule
          </button>
          {depth < 5 && (
            <button
              className={field}
              onClick={() =>
                change({
                  ...g,
                  children: [...g.children, { id: crypto.randomUUID(), logic: "or", children: [] }],
                })
              }
            >
              + Add group
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full w-[460px] flex-col bg-white">
      <header className="flex items-center justify-between border-b p-5">
        <div className="flex items-center gap-3">
          <GitBranch className="h-5 w-5 text-amber-500" />
          <div>
            <h3 className="text-sm font-semibold">{node.name}</h3>
            <p className="mt-1 text-xs text-neutral-500">Condition · Configure</p>
          </div>
        </div>
        <button aria-label="Close inspector" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="flex-1 space-y-5 overflow-y-auto p-5 text-xs">
        <label className="block space-y-2">
          Step name
          <input
            aria-label="Condition name"
            className={field + " block w-full"}
            value={node.name}
            onChange={(e) => onUpdateName(e.target.value)}
          />
        </label>
        <div>
          <h4 className="mb-2 font-semibold">Condition logic</h4>
          <p className="mb-3 text-neutral-500">Choose which events continue to the matched path.</p>
          {group(root, (next) => {
            setEvaluated(false);
            update({ ...c, root_group: next });
          })}
        </div>
        <div className="border-t pt-4">
          <p className="font-semibold">When data is missing</p>
          <p className="mt-2 text-neutral-500">Treat the rule as not matched.</p>
          <label className="mt-3 flex items-center justify-between">
            Case-sensitive text matching
            <input
              type="checkbox"
              checked={c.case_sensitive ?? false}
              onChange={(e) => update({ ...c, case_sensitive: e.target.checked })}
              className="accent-[#FA5D19]"
            />
          </label>
        </div>
        {graph && onRoute && (
          <section className="space-y-2 border-t pt-4">
            <h4 className="font-semibold">Route destinations</h4>
            {(["matched", "not_matched"] as const).map((port) => (
              <label key={port} className="flex items-center justify-between gap-3">
                {port === "matched" ? "Matched" : "Not matched"}
                <select
                  aria-label={`${port} destination`}
                  className={field}
                  value={
                    graph.edges.find((e) => e.source === node.id && e.sourcePort === port)
                      ?.target ?? ""
                  }
                  onChange={(e) => onRoute(port, e.target.value)}
                >
                  <option value="">Choose destination</option>
                  {graph.nodes
                    .filter((n) => n.id !== node.id && n.type !== "trigger")
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                </select>
              </label>
            ))}
          </section>
        )}
        <section className="space-y-3 rounded-lg border bg-neutral-50 p-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Evaluate with sample event</h4>
            <button
              className={field + " flex items-center gap-1"}
              onClick={() => setEvaluated(true)}
            >
              <Play className="h-3 w-3" />
              Evaluate
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[10px] text-neutral-500">
            {JSON.stringify(sample, null, 2)}
          </pre>
          {evaluated && (
            <p
              className={`rounded p-2 ${result.matched ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-700"}`}
            >
              {result.matched ? "✓ Matched" : "Not matched"} · {result.detail}
            </p>
          )}
          <p className="text-[10px] text-neutral-500">
            Sample evaluation only · No actions executed
          </p>
        </section>
      </div>
      <footer className="border-t p-4 text-xs text-neutral-500">
        Changes are applied to the draft. Save draft to persist.
      </footer>
    </div>
  );
}
