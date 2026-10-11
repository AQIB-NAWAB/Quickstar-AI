"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Code,
  Cpu,
  FileText,
  GitCommit,
  GitCompare,
  Layers,
  MessageSquare,
  Play,
  RotateCcw,
  Save,
  Send,
  Sliders,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { Agent, AgentToolDefinition, AgentVersion } from "../lib/types";
import {
  getAgent,
  listVersions,
  publishAgent,
  rollbackAgent,
  updateAgent,
} from "../lib/client";
import { ConflictBanner } from "./conflict-banner";
import { PublishModal } from "./publish-modal";
import { DiffModal } from "./diff-modal";
import { TestChatDrawer } from "./test-chat-drawer";

type Props = {
  workspaceId: string;
  initialAgent: Agent;
};

type TabKey = "identity" | "instructions" | "model" | "tools" | "versions";

const AVAILABLE_TOOLS: AgentToolDefinition[] = [
  {
    name: "knowledge_search",
    description: "Search indexed company documents, guides, and policies",
    parameters: { type: "object", properties: { query: { type: "string" } } },
  },
  {
    name: "order_lookup",
    description: "Look up real-time customer order details and shipment tracking",
    parameters: { type: "object", properties: { order_id: { type: "string" } } },
  },
  {
    name: "process_refund",
    description: "Initiate return and refund authorization for eligible purchases",
    parameters: { type: "object", properties: { order_id: { type: "string" } } },
  },
  {
    name: "send_followup_email",
    description: "Send automated email summary and reference tickets to customer",
    parameters: { type: "object", properties: { email: { type: "string" } } },
  },
];

const AVAILABLE_MODELS = [
  { id: "gpt-4o-mini", label: "OpenAI gpt-4o-mini", desc: "Fast, cost-efficient, everyday queries" },
  { id: "gpt-4o", label: "OpenAI gpt-4o", desc: "Advanced reasoning and complex tool calls" },
  { id: "claude-3-5-sonnet", label: "Anthropic Claude 3.5 Sonnet", desc: "Superior nuanced writing & instruction following" },
  { id: "claude-3-haiku", label: "Anthropic Claude 3 Haiku", desc: "Sub-second fast streaming response" },
];

export function AgentEditor({ workspaceId, initialAgent }: Props) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent>(initialAgent);
  const [activeTab, setActiveTab] = useState<TabKey>("instructions");

  // Form editable states
  const [name, setName] = useState(initialAgent.name);
  const [description, setDescription] = useState(initialAgent.description || "");
  const [instructions, setInstructions] = useState(initialAgent.instructions);
  const [environment, setEnvironment] = useState(initialAgent.environment);
  const [chatEnabled, setChatEnabled] = useState(initialAgent.channels.chat);
  const [voiceEnabled, setVoiceEnabled] = useState(initialAgent.channels.voice);

  const modelSettings = initialAgent.model_settings || {};
  const [model, setModel] = useState((modelSettings.model as string) || "gpt-4o-mini");
  const [temperature, setTemperature] = useState(
    typeof modelSettings.temperature === "number" ? modelSettings.temperature : 0.3,
  );
  const [maxTokens, setMaxTokens] = useState(
    typeof modelSettings.max_tokens === "number" ? modelSettings.max_tokens : 1024,
  );

  const [attachedTools, setAttachedTools] = useState<AgentToolDefinition[]>(
    initialAgent.tools || [],
  );

  // Status & Conflict Handling
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);

  // Versions state
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // Modals & Drawers
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isTestDrawerOpen, setIsTestDrawerOpen] = useState(false);
  const [diffModalState, setDiffModalState] = useState<{
    isOpen: boolean;
    leftId: string;
    rightId: string;
    leftTitle: string;
    rightTitle: string;
  }>({
    isOpen: false,
    leftId: "",
    rightId: "",
    leftTitle: "",
    rightTitle: "",
  });

  // Calculate dirty state
  const isDirty =
    name !== agent.name ||
    description !== (agent.description || "") ||
    instructions !== agent.instructions ||
    environment !== agent.environment ||
    chatEnabled !== agent.channels.chat ||
    voiceEnabled !== agent.channels.voice ||
    model !== ((agent.model_settings?.model as string) || "gpt-4o-mini") ||
    temperature !==
      (typeof agent.model_settings?.temperature === "number"
        ? agent.model_settings.temperature
        : 0.3) ||
    maxTokens !==
      (typeof agent.model_settings?.max_tokens === "number"
        ? agent.model_settings.max_tokens
        : 1024) ||
    JSON.stringify(attachedTools) !== JSON.stringify(agent.tools || []);

  // Fetch versions on tab change
  useEffect(() => {
    if (activeTab === "versions") {
      setVersionsLoading(true);
      listVersions(workspaceId, agent.id).then((res) => {
        setVersionsLoading(false);
        if (res.versions) {
          setVersions(res.versions);
        }
      });
    }
  }, [activeTab, workspaceId, agent.id]);

  // Save handler with Optimistic Concurrency Control
  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const res = await updateAgent(workspaceId, agent.id, {
      name: name.trim(),
      description: description.trim() || null,
      instructions: instructions.trim(),
      environment,
      channels: { chat: chatEnabled, voice: voiceEnabled },
      model_settings: {
        model,
        temperature,
        max_tokens: maxTokens,
      },
      tools: attachedTools,
      expected_version: agent.version,
    });

    setIsSaving(false);
    if (res.isConflict) {
      setIsConflict(true);
    } else if (res.error) {
      setSaveError(res.error.message);
    } else if (res.agent) {
      setAgent(res.agent);
      setIsConflict(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }

  // Reload on 409 conflict
  async function handleReloadServerVersion() {
    setIsSaving(true);
    const res = await getAgent(workspaceId, agent.id);
    setIsSaving(false);
    if (res.agent) {
      const a = res.agent;
      setAgent(a);
      setName(a.name);
      setDescription(a.description || "");
      setInstructions(a.instructions);
      setEnvironment(a.environment);
      setChatEnabled(a.channels.chat);
      setVoiceEnabled(a.channels.voice);
      const m = a.model_settings || {};
      setModel((m.model as string) || "gpt-4o-mini");
      setTemperature(typeof m.temperature === "number" ? m.temperature : 0.3);
      setMaxTokens(typeof m.max_tokens === "number" ? m.max_tokens : 1024);
      setAttachedTools(a.tools || []);
      setIsConflict(false);
      setSaveError(null);
    }
  }

  // Publish release
  async function handlePublishConfirm() {
    const res = await publishAgent(workspaceId, agent.id, agent.version);
    if (res.error) {
      throw new Error(res.error.message);
    }
    if (res.agent) {
      setAgent(res.agent);
      router.refresh();
    }
  }

  // Rollback to earlier release
  async function handleRollback(versionId: string, releaseNum: number) {
    if (
      !confirm(
        `Are you sure you want to rollback to Release #${releaseNum}? The production pointer will immediately switch.`,
      )
    ) {
      return;
    }
    const res = await rollbackAgent(workspaceId, agent.id, versionId);
    if (res.error) {
      alert(`Rollback failed: ${res.error.message}`);
    } else if (res.agent) {
      setAgent(res.agent);
      alert(`Successfully rolled back to Release #${releaseNum}.`);
      router.refresh();
    }
  }

  // Tool attachment toggle
  function toggleTool(tool: AgentToolDefinition) {
    setAttachedTools((prev) => {
      const exists = prev.some((t) => t.name === tool.name);
      if (exists) {
        return prev.filter((t) => t.name !== tool.name);
      }
      return [...prev, tool];
    });
  }

  // Prompt token estimate
  const estimatedTokens = Math.ceil(instructions.length / 4);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-faint">
        <div className="flex items-center gap-3">
          <Link
            href={`/workspaces/${workspaceId}/agents`}
            className="p-1.5 rounded-8 text-neutral-400 hover:text-accent-black hover:bg-neutral-100 transition-colors"
            title="Back to agents"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-accent-black tracking-tight">{agent.name}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-100 text-neutral-600 border border-border-faint">
                Draft v{agent.version}
              </span>
              {agent.production_version_id ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  Live in Production
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Unpublished
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Workspace Agent Workbench · Optimistic concurrency guarded
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isDirty && (
            <span className="text-[11px] font-semibold text-amber-600 px-2 py-1 bg-amber-50 rounded-6 border border-amber-200">
              ● Unsaved edits
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsTestDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 border border-border-faint bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-all shadow-xs"
          >
            <Play className="w-3.5 h-3.5 text-heat-100" />
            Test Agent
          </button>

          <button
            type="button"
            onClick={() => setIsPublishOpen(true)}
            disabled={isDirty}
            title={isDirty ? "Save changes before publishing" : "Publish to production"}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-8 border border-heat-100/40 bg-heat-12 text-xs font-semibold text-heat-100 hover:bg-heat-100 hover:text-white transition-all shadow-xs disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Publish
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving || isConflict}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-8 bg-accent-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-xs disabled:opacity-40"
          >
            {isSaving ? (
              "Saving..."
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* 409 Conflict Banner if triggered */}
      {isConflict && (
        <ConflictBanner
          currentVersion={agent.version}
          onReload={handleReloadServerVersion}
        />
      )}

      {/* General Save Error */}
      {saveError && (
        <div className="p-3 rounded-8 bg-red-50 border border-red-200 text-red-700 text-xs">
          {saveError}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-border-faint flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          { key: "instructions", label: "Instructions & Prompt", icon: FileText },
          { key: "model", label: "Model & Parameters", icon: Cpu },
          { key: "tools", label: "Tools & Functions", icon: Wrench },
          { key: "identity", label: "Identity & Channels", icon: Bot },
          { key: "versions", label: "Releases & Rollback", icon: GitCommit },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-heat-100 text-heat-100 bg-heat-12/30"
                  : "border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
        <Link
          href={`/workspaces/${workspaceId}/agents/${agent.id}/eval`}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 transition-all whitespace-nowrap ml-auto sm:ml-0"
        >
          <BarChart3 className="w-4 h-4 text-[#fa5d19]" />
          Evaluation
        </Link>
      </div>

      {/* TAB 1: INSTRUCTIONS & SYSTEM PROMPT */}
      {activeTab === "instructions" && (
        <div className="space-y-4 rounded-16 border border-border-faint bg-white p-6 shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-accent-black">System Instructions</h3>
              <p className="text-xs text-neutral-500">
                Core behavioral guidelines, business context, persona, and constraints for the LLM.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-500 bg-neutral-50 px-2.5 py-1 rounded-6 border border-border-faint">
              <span>{instructions.length} chars</span>
              <span>·</span>
              <span className="text-accent-black font-semibold">~{estimatedTokens} tokens</span>
            </div>
          </div>

          <textarea
            rows={14}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full px-4 py-3 rounded-10 border border-border-faint text-xs font-mono text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:border-heat-100 shadow-xs leading-relaxed"
            placeholder="Write your agent's system prompt instructions here..."
          />

          <div className="p-3 rounded-10 bg-neutral-50 border border-border-faint text-[11px] text-neutral-600 leading-relaxed">
            <span className="font-semibold text-accent-black">Prompt Engineering Tip:</span> Be explicit
            about boundary conditions (e.g. &ldquo;If the user asks for a refund over $100, instruct them to
            wait for a human manager.&rdquo;). The model uses this prompt on every conversation turn.
          </div>
        </div>
      )}

      {/* TAB 2: MODEL & PARAMETERS */}
      {activeTab === "model" && (
        <div className="space-y-6 rounded-16 border border-border-faint bg-white p-6 shadow-xs animate-in fade-in">
          <div>
            <h3 className="text-sm font-bold text-accent-black">Model Settings & Generation</h3>
            <p className="text-xs text-neutral-500">
              Select the LLM provider, control output creativity, and set generation limits.
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-accent-black">Model Provider</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_MODELS.map((m) => {
                const isSelected = model === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModel(m.id)}
                    className={`p-3.5 rounded-10 border text-left transition-all ${
                      isSelected
                        ? "border-heat-100 bg-heat-12/20 ring-1 ring-heat-100"
                        : "border-border-faint hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-accent-black">{m.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-heat-100" />}
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-500">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label htmlFor="temp-slider" className="text-xs font-bold text-accent-black">
                Temperature
              </label>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-neutral-100 text-accent-black">
                {temperature}
              </span>
            </div>
            <input
              id="temp-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-heat-100 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
              <span>0.0 (Deterministic & Consistent)</span>
              <span>0.5 (Balanced)</span>
              <span>1.0 (Creative & Variable)</span>
            </div>
          </div>

          {/* Max Output Tokens */}
          <div className="space-y-1.5 pt-2 max-w-xs">
            <label htmlFor="max-tokens" className="block text-xs font-bold text-accent-black">
              Max Response Tokens
            </label>
            <input
              id="max-tokens"
              type="number"
              min="128"
              max="4096"
              step="128"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 1024)}
              className="w-full px-3 py-2 rounded-8 border border-border-faint text-xs font-mono text-accent-black focus:outline-hidden focus:border-heat-100"
            />
            <p className="text-[10px] text-neutral-400">
              Maximum tokens generated in a single assistant reply.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: TOOLS & FUNCTIONS */}
      {activeTab === "tools" && (
        <div className="space-y-6 rounded-16 border border-border-faint bg-white p-6 shadow-xs animate-in fade-in">
          <div>
            <h3 className="text-sm font-bold text-accent-black">Agent Tools & Actions</h3>
            <p className="text-xs text-neutral-500">
              Attach callable tools that this agent can execute during conversational turns.
            </p>
          </div>

          <div className="space-y-3">
            {AVAILABLE_TOOLS.map((tool) => {
              const isAttached = attachedTools.some((t) => t.name === tool.name);
              return (
                <div
                  key={tool.name}
                  className={`p-4 rounded-12 border transition-all flex items-start justify-between gap-4 ${
                    isAttached
                      ? "border-neutral-400 bg-neutral-50/50"
                      : "border-border-faint bg-white"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent-black">
                        {tool.name}
                      </span>
                      {isAttached && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-600">{tool.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleTool(tool)}
                    className={`px-3 py-1.5 rounded-8 text-xs font-semibold transition-colors shrink-0 ${
                      isAttached
                        ? "bg-neutral-200 text-neutral-800 hover:bg-neutral-300"
                        : "bg-heat-100 text-white hover:bg-heat-100/90 shadow-xs"
                    }`}
                  >
                    {isAttached ? "Remove Tool" : "Attach Tool"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-10 bg-neutral-50 border border-border-faint text-xs text-neutral-600 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>
              Tools are executed securely within the agent runtime loop. Secret keys stay hidden in
              the secrets vault.
            </span>
          </div>
        </div>
      )}

      {/* TAB 4: IDENTITY & CHANNELS */}
      {activeTab === "identity" && (
        <div className="space-y-6 rounded-16 border border-border-faint bg-white p-6 shadow-xs animate-in fade-in">
          <div>
            <h3 className="text-sm font-bold text-accent-black">Identity & Target Channels</h3>
            <p className="text-xs text-neutral-500">
              Basic metadata, environment tier, and active communication protocols.
            </p>
          </div>

          <div className="space-y-4 max-w-lg">
            <div>
              <label htmlFor="agent-name-edit" className="block text-xs font-bold text-accent-black mb-1">
                Agent Name
              </label>
              <input
                id="agent-name-edit"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-8 border border-border-faint text-xs text-accent-black focus:outline-hidden focus:border-heat-100 shadow-xs"
              />
            </div>

            <div>
              <label htmlFor="agent-desc-edit" className="block text-xs font-bold text-accent-black mb-1">
                Description
              </label>
              <input
                id="agent-desc-edit"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-8 border border-border-faint text-xs text-accent-black focus:outline-hidden focus:border-heat-100 shadow-xs"
              />
            </div>

            <div>
              <label htmlFor="agent-env-edit" className="block text-xs font-bold text-accent-black mb-1">
                Environment
              </label>
              <select
                id="agent-env-edit"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-3.5 py-2 rounded-8 border border-border-faint bg-white text-xs text-accent-black focus:outline-hidden focus:border-heat-100 shadow-xs"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>

            <div className="pt-2">
              <span className="block text-xs font-bold text-accent-black mb-2">Channels</span>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-10 border border-border-faint cursor-pointer hover:bg-neutral-50">
                  <input
                    type="checkbox"
                    checked={chatEnabled}
                    onChange={(e) => setChatEnabled(e.target.checked)}
                    className="w-4 h-4 text-heat-100 rounded border-neutral-300 focus:ring-heat-100"
                  />
                  <div>
                    <p className="text-xs font-semibold text-accent-black">Website Chat Widget</p>
                    <p className="text-[10px] text-neutral-500">
                      Enable text-based conversational sessions
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-10 border border-border-faint cursor-pointer hover:bg-neutral-50">
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(e) => setVoiceEnabled(e.target.checked)}
                    className="w-4 h-4 text-heat-100 rounded border-neutral-300 focus:ring-heat-100"
                  />
                  <div>
                    <p className="text-xs font-semibold text-accent-black">Telephony Voice Calls</p>
                    <p className="text-[10px] text-neutral-500">
                      Enable real-time audio turns via voice edge
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: VERSIONS & ROLLBACK */}
      {activeTab === "versions" && (
        <div className="space-y-6 rounded-16 border border-border-faint bg-white p-6 shadow-xs animate-in fade-in">
          <div>
            <h3 className="text-sm font-bold text-accent-black">Release Versions & History</h3>
            <p className="text-xs text-neutral-500">
              Immutable snapshots created at publish time. The production runtime reads the active
              release pointer.
            </p>
          </div>

          {versionsLoading ? (
            <div className="py-12 text-center text-xs text-neutral-400">Loading version history...</div>
          ) : versions.length === 0 ? (
            <div className="p-8 text-center bg-neutral-50 rounded-12 border border-border-faint text-xs text-neutral-500">
              No releases published yet. Click &ldquo;Publish&rdquo; in the top bar to create your
              first release snapshot.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-border-faint rounded-10 overflow-hidden">
                <thead className="bg-neutral-50 border-b border-border-faint font-semibold text-neutral-600">
                  <tr>
                    <th className="p-3">Release #</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created At</th>
                    <th className="p-3">Model</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-faint">
                  {versions.map((v) => {
                    const isProduction = agent.production_version_id === v.id;
                    const vModel = (v.snapshot.model_settings?.model as string) || "gpt-4o-mini";

                    return (
                      <tr key={v.id} className="hover:bg-neutral-50/50">
                        <td className="p-3 font-mono font-bold text-accent-black">
                          Release #{v.release_number}
                        </td>
                        <td className="p-3">
                          {isProduction ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                              Current Production
                            </span>
                          ) : (
                            <span className="text-neutral-400 font-mono text-[11px]">Archived</span>
                          )}
                        </td>
                        <td className="p-3 text-neutral-500 font-mono text-[11px]">
                          {new Date(v.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-neutral-600">{vModel}</td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              // Compare with current live release or previous
                              const otherVersion =
                                versions.find((other) => other.id !== v.id) || v;
                              setDiffModalState({
                                isOpen: true,
                                leftId: v.id,
                                rightId: otherVersion.id,
                                leftTitle: `Release #${v.release_number}`,
                                rightTitle: `Release #${otherVersion.release_number}`,
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-6 border border-border-faint text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100"
                          >
                            <GitCompare className="w-3 h-3" />
                            Diff
                          </button>

                          {!isProduction && (
                            <button
                              type="button"
                              onClick={() => handleRollback(v.id, v.release_number)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-6 bg-neutral-100 text-[11px] font-semibold text-neutral-800 hover:bg-heat-100 hover:text-white transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Rollback
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Publish Modal */}
      <PublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        onConfirm={handlePublishConfirm}
        agent={agent}
        hasUnsavedChanges={isDirty}
      />

      {/* Diff Modal */}
      <DiffModal
        isOpen={diffModalState.isOpen}
        onClose={() => setDiffModalState((prev) => ({ ...prev, isOpen: false }))}
        workspaceId={workspaceId}
        agentId={agent.id}
        leftId={diffModalState.leftId}
        rightId={diffModalState.rightId}
        leftTitle={diffModalState.leftTitle}
        rightTitle={diffModalState.rightTitle}
      />

      {/* Test Chat Slide-Over Drawer */}
      <TestChatDrawer
        isOpen={isTestDrawerOpen}
        onClose={() => setIsTestDrawerOpen(false)}
        workspaceId={workspaceId}
        agent={agent}
      />
    </div>
  );
}
