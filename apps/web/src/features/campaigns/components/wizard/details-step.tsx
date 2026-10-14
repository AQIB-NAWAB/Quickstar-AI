"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listAgents } from "../../../agents/lib/client";
import type { Agent } from "../../../agents/lib/types";
import { SAMPLE_AVAILABLE_AGENTS } from "../../lib/fixtures";
import type { CampaignTelephonyMode } from "../../lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface DetailsStepProps {
  workspaceId: string;
  isPreview?: boolean;
  name: string;
  description: string;
  agentId: string;
  telephonyMode: CampaignTelephonyMode;
  onUpdate: (data: {
    name: string;
    description: string;
    agentId: string;
    agentName: string;
    telephonyMode: CampaignTelephonyMode;
  }) => void;
  onContinue: () => void;
}

type AgentOption = { id: string; name: string; voiceCapable: boolean };

export function DetailsStep({
  workspaceId,
  isPreview = false,
  name,
  description,
  agentId,
  telephonyMode,
  onUpdate,
  onContinue,
}: DetailsStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [liveAgents, setLiveAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(!isPreview);

  useEffect(() => {
    if (isPreview) return;
    const controller = new AbortController();
    setLoadingAgents(true);
    listAgents(workspaceId)
      .then((res) => {
        if (controller.signal.aborted) return;
        setLiveAgents(res.agents ?? []);
        setLoadingAgents(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLiveAgents([]);
          setLoadingAgents(false);
        }
      });
    return () => controller.abort();
  }, [workspaceId, isPreview]);

  const agentOptions: AgentOption[] = useMemo(() => {
    if (isPreview) {
      return SAMPLE_AVAILABLE_AGENTS;
    }
    return liveAgents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      voiceCapable: Boolean(agent.channels?.voice),
    }));
  }, [isPreview, liveAgents]);

  useEffect(() => {
    if (isPreview || loadingAgents || agentOptions.length === 0) return;
    const current = agentOptions.find((agent) => agent.id === agentId);
    if (current && UUID_RE.test(agentId)) return;
    const next = agentOptions[0];
    onUpdate({
      name,
      description,
      agentId: next.id,
      agentName: next.name,
      telephonyMode,
    });
  }, [
    agentId,
    agentOptions,
    description,
    isPreview,
    loadingAgents,
    name,
    onUpdate,
    telephonyMode,
  ]);

  function handleContinue() {
    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }
    if (!isPreview && (!agentId || !UUID_RE.test(agentId))) {
      setError("Select a workspace agent before continuing.");
      return;
    }
    if (!isPreview && agentOptions.length === 0) {
      setError("Create at least one agent in this workspace before starting a campaign.");
      return;
    }
    setError(null);
    onContinue();
  }

  const selectedAgent =
    agentOptions.find((a) => a.id === agentId) ?? agentOptions[0] ?? null;

  return (
    <div className="bg-white border border-border-faint rounded-12 p-6 shadow-xs max-w-xl mx-auto space-y-5">
      <div>
        <h3 className="text-base font-bold text-accent-black tracking-tight">
          Step 1 &middot; Campaign Details
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Name the campaign, choose whether it uses outbound calls, and pick an agent.
        </p>
      </div>

      <div className="space-y-4 text-xs">
        <div className="space-y-2">
          <span className="font-semibold text-neutral-700 block">Campaign type</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdate({
                  name,
                  description,
                  agentId: selectedAgent?.id ?? "",
                  agentName: selectedAgent?.name ?? "",
                  telephonyMode: "required",
                })
              }
              className={`px-3 py-2 rounded-8 text-left border ${
                telephonyMode === "required"
                  ? "border-heat-100 bg-orange-50"
                  : "border-border-faint bg-white"
              }`}
            >
              <span className="block font-semibold text-accent-black text-xs">Outbound calls</span>
              <span className="block text-[11px] text-neutral-500 mt-0.5">
                Audience must include dialable phone numbers.
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdate({
                  name,
                  description,
                  agentId: selectedAgent?.id ?? "",
                  agentName: selectedAgent?.name ?? "",
                  telephonyMode: "none",
                })
              }
              className={`px-3 py-2 rounded-8 text-left border ${
                telephonyMode === "none"
                  ? "border-heat-100 bg-orange-50"
                  : "border-border-faint bg-white"
              }`}
            >
              <span className="block font-semibold text-accent-black text-xs">Audience only</span>
              <span className="block text-[11px] text-neutral-500 mt-0.5">
                Save contacts without telephony (name or email is enough).
              </span>
            </button>
          </div>
        </div>
        {/* Campaign Name */}
        <div className="space-y-1">
          <label className="font-semibold text-neutral-700 block">
            Campaign name <span className="text-heat-100">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setError(null);
              onUpdate({
                name: e.target.value,
                description,
                agentId: selectedAgent?.id ?? "",
                agentName: selectedAgent?.name ?? "",
                telephonyMode,
              });
            }}
            placeholder="e.g. Product demo follow-up"
            className="w-full px-3 py-2 border border-border-faint rounded-8 bg-white focus:outline-none focus:border-heat-100 text-accent-black"
          />
          {error && <p className="text-[11px] text-red-600">{error}</p>}
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="font-semibold text-neutral-700 block">
            Description <span className="text-neutral-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) =>
              onUpdate({
                name,
                description: e.target.value,
                agentId: selectedAgent?.id ?? "",
                agentName: selectedAgent?.name ?? "",
                telephonyMode,
              })
            }
            rows={3}
            placeholder="Brief explanation of target audience and campaign goal"
            className="w-full px-3 py-2 border border-border-faint rounded-8 bg-white focus:outline-none focus:border-heat-100 text-accent-black"
          />
        </div>

        {/* Agent Selector */}
        <div className="space-y-1">
          <label className="font-semibold text-neutral-700 block">
            {telephonyMode === "none" ? "Linked agent" : "Outbound voice agent"}{" "}
            <span className="text-heat-100">*</span>
          </label>
          {loadingAgents ? (
            <p className="text-[11px] text-neutral-500">Loading workspace agents…</p>
          ) : agentOptions.length === 0 ? (
            <div className="rounded-8 border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
              No agents in this workspace yet.{" "}
              {!isPreview && (
                <Link
                  href={`/workspaces/${workspaceId}/agents`}
                  className="font-semibold text-heat-100 hover:underline"
                >
                  Create an agent
                </Link>
              )}
            </div>
          ) : (
            <select
              value={selectedAgent?.id ?? ""}
              onChange={(e) => {
                const agent =
                  agentOptions.find((a) => a.id === e.target.value) ?? agentOptions[0];
                onUpdate({
                  name,
                  description,
                  agentId: agent.id,
                  agentName: agent.name,
                  telephonyMode,
                });
              }}
              className="w-full px-3 py-2 border border-border-faint rounded-8 bg-white focus:outline-none focus:border-heat-100 text-accent-black"
            >
              {agentOptions.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {agent.voiceCapable ? "(Voice enabled)" : ""}
                </option>
              ))}
            </select>
          )}
          <p className="text-[11px] text-neutral-400">
            {telephonyMode === "none"
              ? "Stored on the campaign for reporting; audience-only runs do not place calls."
              : "Pick an agent with voice enabled when you plan to launch outbound calls later."}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end pt-3 border-t border-border-faint">
        <button
          type="button"
          onClick={handleContinue}
          className="px-5 py-2 rounded-6 text-xs font-semibold bg-heat-100 text-white hover:bg-[#e04e10] shadow-xs transition-colors"
        >
          Continue &rarr;
        </button>
      </div>
    </div>
  );
}
