"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, MessageSquare, Mic, Sparkles } from "lucide-react";
import { createAgent } from "../lib/client";

type Props = {
  workspaceId: string;
};

export function CreateAgentForm({ workspaceId }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState(
    "You are a helpful, professional customer assistant for our business. Answer questions accurately based on company information and guide the user with clear next steps.",
  );
  const [chatEnabled, setChatEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [environment, setEnvironment] = useState("production");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Agent name is required");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await createAgent(workspaceId, {
      name: name.trim(),
      description: description.trim() || null,
      instructions: instructions.trim(),
      environment,
      channels: {
        chat: chatEnabled,
        voice: voiceEnabled,
      },
      model_settings: {
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 1024,
      },
      tools: [],
    });

    setLoading(false);
    if (res.error) {
      setError(res.error.message);
    } else if (res.agent) {
      router.push(`/workspaces/${workspaceId}/agents/${res.agent.id}`);
      router.refresh();
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href={`/workspaces/${workspaceId}/agents`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-accent-black transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Agents
      </Link>

      <div className="rounded-16 border border-border-faint bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 pb-6 border-b border-border-faint">
          <div className="w-10 h-10 rounded-12 bg-heat-12 text-heat-100 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-accent-black">Create a New Agent</h1>
            <p className="text-xs text-neutral-500">
              Set up initial identity, instructions, and communication channels.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-8 bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Agent Name */}
          <div>
            <label htmlFor="agent-name" className="block text-xs font-bold text-accent-black mb-1.5">
              Agent Name <span className="text-heat-100">*</span>
            </label>
            <input
              id="agent-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer Support Bot, Sales Concierge"
              className="w-full px-3.5 py-2.5 rounded-8 border border-border-faint text-xs text-accent-black placeholder-neutral-400 focus:outline-hidden focus:border-heat-100 shadow-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="agent-desc" className="block text-xs font-bold text-accent-black mb-1.5">
              Short Description
            </label>
            <input
              id="agent-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Answers order queries, return policy questions, and FAQs"
              className="w-full px-3.5 py-2.5 rounded-8 border border-border-faint text-xs text-accent-black placeholder-neutral-400 focus:outline-hidden focus:border-heat-100 shadow-xs"
            />
          </div>

          {/* Initial Instructions */}
          <div>
            <label htmlFor="agent-instructions" className="block text-xs font-bold text-accent-black mb-1.5">
              System Instructions
            </label>
            <textarea
              id="agent-instructions"
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-8 border border-border-faint text-xs font-mono text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:border-heat-100 shadow-xs leading-relaxed"
            />
            <p className="mt-1 text-[11px] text-neutral-400">
              You can fine-tune prompts and configure detailed guardrails anytime in the editor.
            </p>
          </div>

          {/* Channels Selection */}
          <div className="pt-2">
            <span className="block text-xs font-bold text-accent-black mb-2">
              Enabled Channels
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-10 border border-border-faint cursor-pointer hover:bg-neutral-50 transition-colors">
                <input
                  type="checkbox"
                  checked={chatEnabled}
                  onChange={(e) => setChatEnabled(e.target.checked)}
                  className="w-4 h-4 text-heat-100 rounded border-neutral-300 focus:ring-heat-100"
                />
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-neutral-600" />
                  <div>
                    <p className="text-xs font-semibold text-accent-black">Website Chat</p>
                    <p className="text-[10px] text-neutral-500">Widget and staff chat</p>
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-10 border border-border-faint cursor-pointer hover:bg-neutral-50 transition-colors">
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => setVoiceEnabled(e.target.checked)}
                  className="w-4 h-4 text-heat-100 rounded border-neutral-300 focus:ring-heat-100"
                />
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-neutral-600" />
                  <div>
                    <p className="text-xs font-semibold text-accent-black">Voice Calls</p>
                    <p className="text-[10px] text-neutral-500">Inbound and outbound voice</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Environment */}
          <div>
            <label htmlFor="agent-env" className="block text-xs font-bold text-accent-black mb-1.5">
              Target Environment
            </label>
            <select
              id="agent-env"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-8 border border-border-faint bg-white text-xs text-accent-black focus:outline-hidden focus:border-heat-100 shadow-xs"
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-border-faint flex items-center justify-end gap-3">
            <Link
              href={`/workspaces/${workspaceId}/agents`}
              className="px-4 py-2.5 rounded-8 border border-border-faint text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-8 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                "Creating agent..."
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Agent & Configure
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
