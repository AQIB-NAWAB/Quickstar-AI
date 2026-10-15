"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Agent, AgentToolDefinition, AgentVersion } from "../lib/types";
import {
  getAgent,
  listVersions,
  publishAgent,
  rollbackAgent,
  updateAgent,
} from "../lib/client";
import { EditorHeader } from "./editor-header";
import { EditorTabs, type EditorTabKey } from "./editor-tabs";
import { InstructionsTab } from "./instructions-tab";
import { ModelTab } from "./model-tab";
import { ToolsTab } from "./tools-tab";
import { IdentityChannelsTab } from "./identity-channels-tab";
import { ReleasesTab } from "./releases-tab";
import { TestAgentPanel } from "./test-agent-panel";
import { ConflictBanner } from "./conflict-banner";
import { PublishModal } from "./publish-modal";
import { DiffModal } from "./diff-modal";

type Props = {
  workspaceId: string;
  initialAgent: Agent;
};

export function AgentEditor({ workspaceId, initialAgent }: Props) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent>(initialAgent);
  const [activeTab, setActiveTab] = useState<EditorTabKey>("instructions");

  // Form state
  const [name, setName] = useState(initialAgent.name);
  const [description, setDescription] = useState(initialAgent.description || "");
  const [instructions, setInstructions] = useState(initialAgent.instructions);
  const [environment, setEnvironment] = useState(initialAgent.environment);
  const [chatEnabled, setChatEnabled] = useState(initialAgent.channels.chat);
  const [voiceEnabled, setVoiceEnabled] = useState(initialAgent.channels.voice);
  const [ttsVoiceId, setTtsVoiceId] = useState(
    initialAgent.voice?.tts_voice_id || "uplift:v_8eelc901",
  );
  const [voiceLanguage, setVoiceLanguage] = useState(
    initialAgent.voice?.language || "ur-PK",
  );

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
  const [versionsError, setVersionsError] = useState<string | null>(null);

  // Modals & Panels
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isTestInlineOpen, setIsTestInlineOpen] = useState(true);
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
  const isDirty = useMemo(() => {
    return (
      name.trim() !== agent.name.trim() ||
      description.trim() !== (agent.description || "").trim() ||
      instructions.trim() !== agent.instructions.trim() ||
      environment !== agent.environment ||
      chatEnabled !== agent.channels.chat ||
      voiceEnabled !== agent.channels.voice ||
      ttsVoiceId !== (agent.voice?.tts_voice_id || "uplift:v_8eelc901") ||
      voiceLanguage !== (agent.voice?.language || "ur-PK") ||
      model !== ((agent.model_settings?.model as string) || "gpt-4o-mini") ||
      temperature !==
        (typeof agent.model_settings?.temperature === "number"
          ? agent.model_settings.temperature
          : 0.3) ||
      maxTokens !==
        (typeof agent.model_settings?.max_tokens === "number"
          ? agent.model_settings.max_tokens
          : 1024) ||
      JSON.stringify(attachedTools) !== JSON.stringify(agent.tools || [])
    );
  }, [
    name,
    description,
    instructions,
    environment,
    chatEnabled,
    voiceEnabled,
    ttsVoiceId,
    voiceLanguage,
    model,
    temperature,
    maxTokens,
    attachedTools,
    agent,
  ]);

  // Window unload warning if dirty
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Fetch versions
  const fetchVersions = () => {
    setVersionsLoading(true);
    setVersionsError(null);
    listVersions(workspaceId, agent.id)
      .then((res) => {
        setVersionsLoading(false);
        if (res.error) {
          setVersionsError(res.error.message);
        } else if (res.versions) {
          setVersions(res.versions);
        }
      })
      .catch((err) => {
        setVersionsLoading(false);
        setVersionsError(err instanceof Error ? err.message : "Failed to load versions");
      });
  };

  useEffect(() => {
    if (activeTab === "releases") {
      fetchVersions();
    }
  }, [activeTab, workspaceId, agent.id]);

  // Save handler with Optimistic Concurrency Control
  async function handleSave() {
    if (isSaving || !isDirty) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await updateAgent(workspaceId, agent.id, {
        name: name.trim(),
        description: description.trim() || null,
        instructions: instructions.trim(),
        environment,
        channels: { chat: chatEnabled, voice: voiceEnabled },
        model_settings: {
          ...agent.model_settings,
          model,
          model_id: model,
          profile: model.startsWith("claude")
            ? "anthropic"
            : model.includes("/") || /llama|mixtral|gemma|gpt-oss/i.test(model)
              ? "groq"
              : "openai",
          temperature,
          max_tokens: maxTokens,
        },
        tools: attachedTools,
        voice: {
          voice_mode: agent.voice?.voice_mode || "cascade",
          language: voiceLanguage,
          tts_voice_id: ttsVoiceId,
          max_response_chars: agent.voice?.max_response_chars ?? 500,
          turn_detection_profile_id: agent.voice?.turn_detection_profile_id || "eager",
          recording_enabled: agent.voice?.recording_enabled ?? true,
        },
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
    } catch (err: unknown) {
      setIsSaving(false);
      setSaveError(err instanceof Error ? err.message : "Save failed");
    }
  }

  // Reload latest server version on 409
  async function handleReloadServerVersion() {
    setIsSaving(true);
    try {
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
        setTtsVoiceId(a.voice?.tts_voice_id || "uplift:v_8eelc901");
        setVoiceLanguage(a.voice?.language || "ur-PK");
        const m = a.model_settings || {};
        setModel((m.model as string) || "gpt-4o-mini");
        setTemperature(typeof m.temperature === "number" ? m.temperature : 0.3);
        setMaxTokens(typeof m.max_tokens === "number" ? m.max_tokens : 1024);
        setAttachedTools(a.tools || []);
        setIsConflict(false);
        setSaveError(null);
      }
    } catch {
      setIsSaving(false);
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
      fetchVersions();
      router.refresh();
    }
  }

  // Rollback to earlier release
  async function handleRollbackConfirm(versionId: string) {
    const res = await rollbackAgent(workspaceId, agent.id, versionId);
    if (res.error) {
      throw new Error(res.error.message);
    }
    if (res.agent) {
      setAgent(res.agent);
      fetchVersions();
      router.refresh();
    }
  }

  // Tool management
  function handleRemoveTool(toolName: string) {
    setAttachedTools((prev) => prev.filter((t) => t.name !== toolName));
  }

  function handleSaveTool(toolDef: AgentToolDefinition) {
    setAttachedTools((prev) => {
      const existingIdx = prev.findIndex((t) => t.name === toolDef.name);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = toolDef;
        return updated;
      }
      return [...prev, toolDef];
    });
  }

  // Whether inline test panel is supported on this tab
  const canShowInlineTest =
    activeTab === "instructions" || activeTab === "model" || activeTab === "tools";

  // Derive latest release number for label display if available
  const currentLiveRelease = versions.find((v) => v.id === agent.production_version_id);
  const liveReleaseNumber = currentLiveRelease?.release_number;

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Header */}
      <EditorHeader
        agent={agent}
        releaseNumber={liveReleaseNumber}
        workspaceId={workspaceId}
        showTestButton={!canShowInlineTest || !isTestInlineOpen}
        isDirty={isDirty}
        isSaving={isSaving}
        saveSuccess={saveSuccess}
        onSave={handleSave}
        onPublish={() => setIsPublishOpen(true)}
        onToggleTest={() => {
          if (canShowInlineTest) {
            setIsTestInlineOpen((prev) => !prev);
          } else {
            setIsTestDrawerOpen((prev) => !prev);
          }
        }}
        isTestDrawerOpen={canShowInlineTest ? isTestInlineOpen : isTestDrawerOpen}
      />

      {/* 409 Conflict Banner */}
      {isConflict && (
        <ConflictBanner currentVersion={agent.version} onReload={handleReloadServerVersion} />
      )}

      {/* Save Error Banner */}
      {saveError && !isConflict && (
        <div className="p-3.5 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-center justify-between">
          <span>{saveError}</span>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="text-[12px] underline hover:no-underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs navigation */}
      <EditorTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        workspaceId={workspaceId}
        agentId={agent.id}
      />

      {/* Tab Panels */}
      <div className="pt-2">
        {/* Instructions, Model, or Tools Tab layout: Left form (62%), Right Test Panel (38%) */}
        {canShowInlineTest ? (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.67fr)_minmax(0,1fr)] gap-6 items-start">
            {/* Primary Editing Column */}
            <div className={isTestInlineOpen ? "min-w-0 space-y-6" : "xl:col-span-2 min-w-0 space-y-6"}>
              {activeTab === "instructions" && (
                <InstructionsTab
                  instructions={instructions}
                  onChangeInstructions={setInstructions}
                  isDirty={isDirty}
                />
              )}

              {activeTab === "model" && (
                <ModelTab
                  model={model}
                  onChangeModel={setModel}
                  temperature={temperature}
                  onChangeTemperature={setTemperature}
                  maxTokens={maxTokens}
                  onChangeMaxTokens={setMaxTokens}
                  isDirty={isDirty}
                />
              )}

              {activeTab === "tools" && (
                <ToolsTab
                  tools={attachedTools}
                  onRemoveTool={handleRemoveTool}
                  onSaveTool={handleSaveTool}
                  isDirty={isDirty}
                />
              )}
            </div>

            {/* Test Agent Inline Panel */}
            {isTestInlineOpen && (
              <div className="min-w-0 xl:sticky xl:top-4">
                <TestAgentPanel
                  agent={agent}
                  workspaceId={workspaceId}
                  releaseNumber={liveReleaseNumber}
                  isInline={true}
                  onClose={() => setIsTestInlineOpen(false)}
                />
              </div>
            )}
          </div>
        ) : null}

        {/* Identity & Channels Tab */}
        {activeTab === "identity" && (
          <IdentityChannelsTab
            workspaceId={workspaceId}
            name={name}
            onChangeName={setName}
            description={description}
            onChangeDescription={setDescription}
            environment={environment}
            onChangeEnvironment={setEnvironment}
            chatEnabled={chatEnabled}
            onChangeChatEnabled={setChatEnabled}
            voiceEnabled={voiceEnabled}
            onChangeVoiceEnabled={setVoiceEnabled}
            selectedVoiceId={ttsVoiceId}
            onChangeVoice={({ voiceId, language }) => {
              setTtsVoiceId(voiceId);
              setVoiceLanguage(language);
            }}
          />
        )}

        {/* Releases & Rollback Tab */}
        {activeTab === "releases" && (
          <ReleasesTab
            agent={agent}
            versions={versions}
            loading={versionsLoading}
            error={versionsError}
            onRefresh={fetchVersions}
            onRollback={handleRollbackConfirm}
            onOpenDiff={(leftId, rightId, leftTitle, rightTitle) => {
              setDiffModalState({
                isOpen: true,
                leftId,
                rightId,
                leftTitle,
                rightTitle,
              });
            }}
          />
        )}
      </div>

      {/* Floating Test Drawer (used on Identity, Releases, or when triggered from header) */}
      {!canShowInlineTest && isTestDrawerOpen && (
        <TestAgentPanel
          agent={agent}
          workspaceId={workspaceId}
          releaseNumber={liveReleaseNumber}
          isInline={false}
          onClose={() => setIsTestDrawerOpen(false)}
        />
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
        onClose={() =>
          setDiffModalState((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
        workspaceId={workspaceId}
        agentId={agent.id}
        leftId={diffModalState.leftId}
        rightId={diffModalState.rightId}
        leftTitle={diffModalState.leftTitle}
        rightTitle={diffModalState.rightTitle}
      />
    </div>
  );
}
