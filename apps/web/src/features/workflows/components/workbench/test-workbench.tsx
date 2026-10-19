"use client";

import React, { useState } from "react";
import { X, Play, CheckCircle2, AlertCircle, Copy, Check, ChevronRight } from "lucide-react";
import type { StepExecutionTrace, WorkflowSimulationResult } from "../../lib/types";

export type TestWorkbenchProps = {
  isOpen: boolean;
  onClose: () => void;
  isRunning: boolean;
  simulationResult: WorkflowSimulationResult | null;
  onRunTest: (payload: Record<string, unknown>) => Promise<void>;
  defaultPayload?: Record<string, unknown>;
};

const PRESETS = [
  {
    name: "Visitor Inquires About Pricing & Demo",
    payload: {
      id: "evt_pricing_demo",
      type: "message.appended",
      conversation_id: "conv_lead_101",
      message: {
        id: "msg_p1",
        text: "Hi, I need pricing information and an enterprise demo.",
        sender_type: "visitor",
        role: "user",
      },
      customer: {
        id: "cust_demo_01",
        tier: "Standard",
        email: "sarah@initech.corp",
      },
    },
  },
  {
    name: "Customer Requests Live Human Representative",
    payload: {
      id: "evt_human_request",
      type: "message.appended",
      conversation_id: "conv_supp_202",
      message: {
        id: "msg_h1",
        text: "Please let me speak with a live support agent right now.",
        sender_type: "visitor",
        role: "user",
      },
      customer: {
        id: "cust_supp_02",
        tier: "Standard",
        email: "bob@initech.corp",
      },
    },
  },
  {
    name: "VIP Enterprise Customer Incident",
    payload: {
      id: "evt_vip_urgent",
      type: "message.appended",
      conversation_id: "conv_vip_303",
      message: {
        id: "msg_v1",
        text: "Critical outage on our production API cluster.",
        sender_type: "visitor",
        role: "user",
      },
      customer: {
        id: "cust_vip_03",
        tier: "Enterprise",
        email: "cto@megacorp.com",
      },
    },
  },
  {
    name: "Conversation Resolved & Released",
    payload: {
      id: "evt_rel_404",
      type: "conversation.released",
      conversation_id: "conv_resolved_404",
      released_by_user_id: "usr_agent_07",
      resolution_status: "resolved",
    },
  },
];

export const TestWorkbench: React.FC<TestWorkbenchProps> = ({
  isOpen,
  onClose,
  isRunning,
  simulationResult,
  onRunTest,
  defaultPayload,
}) => {
  const initialPayload = defaultPayload || PRESETS[0].payload;

  const [payloadText, setPayloadText] = useState(JSON.stringify(initialPayload, null, 2));
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0].name);
  const [selectedTraceIndex, setSelectedTraceIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePresetChange = (name: string) => {
    setSelectedPreset(name);
    const found = PRESETS.find((p) => p.name === name);
    if (found) {
      setPayloadText(JSON.stringify(found.payload, null, 2));
    }
  };

  const handleExecute = async () => {
    setErrorMsg(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payloadText);
    } catch (err: unknown) {
      setErrorMsg("Payload is not valid JSON. Please correct formatting.");
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setErrorMsg("Enter a JSON event object.");
      return;
    }
    try {
      await onRunTest(parsed);
      setSelectedTraceIndex(0);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Simulation failed");
    }
  };

  const selectedTrace: StepExecutionTrace | undefined =
    simulationResult?.traces[selectedTraceIndex] || simulationResult?.traces[0];

  const copyStepOutput = () => {
    if (selectedTrace) {
      navigator.clipboard.writeText(JSON.stringify(selectedTrace.output || {}, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-300 shadow-sm flex flex-col h-[340px] select-none text-neutral-800 animate-in slide-in-from-bottom-5 duration-150">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-white text-neutral-900">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FA5D19]" />
            <h3 className="text-xs font-bold tracking-wide uppercase">Test Workbench</h3>
          </div>
          <span className="text-[11px] text-neutral-400">
            Side-effect-free dry-run simulation across DAG branches
          </span>
        </div>

        <div className="flex items-center gap-3">
          {simulationResult && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400">Status:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  simulationResult.status === "succeeded"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : simulationResult.status === "skipped"
                      ? "bg-neutral-700 text-neutral-300"
                      : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {simulationResult.status.toUpperCase()}
              </span>
              <span className="text-neutral-400">({simulationResult.duration_ms}ms)</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3 Panels Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel 1: Test Event Payload */}
        <div className="w-[32%] border-r border-neutral-200 flex flex-col bg-neutral-50/50">
          <div className="p-2.5 border-b border-neutral-200 flex items-center justify-between bg-white">
            <span className="text-xs font-bold text-neutral-700">1. Event Payload (Input)</span>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="text-[11px] border border-neutral-300 rounded px-2 py-0.5 max-w-[170px] truncate bg-white outline-none"
            >
              {PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 p-2 flex flex-col">
            <textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              className="flex-1 p-2 font-mono text-[11px] bg-white border border-neutral-300 rounded-lg outline-none focus:ring-1 focus:ring-[#FA5D19] leading-tight resize-none"
            />
            {errorMsg && (
              <span className="text-[10px] text-rose-600 mt-1 font-medium">{errorMsg}</span>
            )}
          </div>

          <div className="p-2.5 border-t border-neutral-200 bg-white flex justify-end">
            <button
              onClick={handleExecute}
              disabled={isRunning}
              className="px-4 py-1.5 bg-[#FA5D19] hover:bg-[#e04f12] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? "Simulating..." : "Run Dry-Run Test"}</span>
            </button>
          </div>
        </div>

        {/* Panel 2: Execution Trace Timeline */}
        <div className="w-[34%] border-r border-neutral-200 flex flex-col bg-white">
          <div className="p-2.5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
            <span className="text-xs font-bold text-neutral-700">
              2. Execution Trace ({simulationResult?.traces.length ?? 0} Steps)
            </span>
            <span className="text-[11px] text-neutral-400">Click step to inspect</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {simulationResult ? (
              simulationResult.traces.map((trace, idx) => {
                const isSelected = idx === selectedTraceIndex;
                return (
                  <div
                    key={trace.step_id || idx}
                    onClick={() => setSelectedTraceIndex(idx)}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-orange-50/70 border-[#FA5D19] ring-1 ring-[#FA5D19]/20"
                        : "bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {trace.status === "succeeded" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : trace.status === "failed" ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-neutral-300 text-neutral-400 text-[10px] flex items-center justify-center font-bold">
                          –
                        </span>
                      )}
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-neutral-900 truncate block">
                          {trace.step_name || trace.node_name || trace.step_id}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {trace.node_type} • {trace.duration_ms}ms
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {trace.chosen_port && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-600">
                          {trace.chosen_port}
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-neutral-400 text-xs">
                Click "Run Dry-Run Test" to simulate execution.
              </div>
            )}
          </div>
        </div>

        {/* Panel 3: Step Output & Evaluated State */}
        <div className="w-[34%] flex flex-col bg-neutral-50/50">
          <div className="p-2.5 border-b border-neutral-200 flex items-center justify-between bg-white">
            <span className="text-xs font-bold text-neutral-700">
              3. Step Output:{" "}
              {selectedTrace ? selectedTrace.step_name || selectedTrace.node_name : "Inspect"}
            </span>
            {selectedTrace && (
              <button
                onClick={copyStepOutput}
                className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-800"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copied ? "Copied" : "Copy Output"}</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {selectedTrace ? (
              <div className="space-y-2 text-xs">
                {selectedTrace.logs && selectedTrace.logs.length > 0 && (
                  <div className="p-2 bg-neutral-100 rounded text-[11px] text-neutral-700 font-mono">
                    {selectedTrace.logs.join("\n")}
                  </div>
                )}

                <div>
                  <span className="text-[11px] font-semibold text-neutral-600 block mb-1">
                    Outputs payload:
                  </span>
                  <pre className="p-2.5 bg-neutral-900 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto leading-tight">
                    {JSON.stringify(selectedTrace.output || {}, null, 2)}
                  </pre>
                </div>

                {selectedTrace.error && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                    <span className="font-bold block mb-0.5">Step Error:</span>
                    <span>{selectedTrace.error.message}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-400 text-xs">
                Select a step in trace to view output.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
