"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Bot, Send, Trash2, User, X } from "lucide-react";
import { createTestConversation, executeTestTurn } from "../lib/client";
import type { Agent } from "../lib/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  agent: Agent;
};

type ChatMessage = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
};

export function TestChatDrawer({ isOpen, onClose, workspaceId, agent }: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize a conversation when drawer opens
  useEffect(() => {
    if (!isOpen) return;

    if (!agent.production_version_id) {
      setInitError("This agent has no published version. Please publish a release to test.");
      return;
    }

    setInitError(null);
    if (!conversationId) {
      createTestConversation(workspaceId, agent.id).then((res) => {
        if (res.error) {
          setInitError(res.error.message);
        } else if (res.conversationId) {
          setConversationId(res.conversationId);
          setMessages([
            {
              id: "welcome",
              sender: "assistant",
              text: `Hello! I am ${agent.name}. How can I help you today?`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
      });
    }
  }, [isOpen, workspaceId, agent.id, agent.name, agent.production_version_id, conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !conversationId || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await executeTestTurn(workspaceId, conversationId, text);
      if (res.error) {
        const errorText = `[Error: ${res.error.message}]`;
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: "assistant",
            text: errorText,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: "assistant",
            text: res.assistantText || "[No reply generated]",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: `[Error: ${err instanceof Error ? err.message : "Request failed"}]`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setMessages([]);
    setConversationId(null);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md h-full bg-white shadow-2xl flex flex-col border-l border-border-faint">
        {/* Drawer Header */}
        <div className="p-4 border-b border-border-faint flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-8 bg-heat-12 text-heat-100 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-accent-black truncate">{agent.name}</h3>
              <p className="text-[11px] text-neutral-500 font-mono">
                {agent.production_version_id ? "Live Published Test" : "Draft (Unpublished)"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleReset}
              title="Reset conversation"
              className="p-1.5 rounded-8 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-8 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50/50">
          {initError ? (
            <div className="p-4 rounded-12 bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Notice</p>
                <p className="mt-1 leading-relaxed">{initError}</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 p-6">
              <Bot className="w-8 h-8 text-neutral-300 mb-2" />
              <p className="text-xs">Connecting to agent test session...</p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 text-xs ${
                  m.sender === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-6 flex items-center justify-center shrink-0 text-[10px] ${
                    m.sender === "user"
                      ? "bg-accent-black text-white"
                      : "bg-heat-12 text-heat-100"
                  }`}
                >
                  {m.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div
                  className={`max-w-[80%] rounded-12 px-3 py-2 leading-relaxed ${
                    m.sender === "user"
                      ? "bg-accent-black text-white rounded-tr-xs"
                      : "bg-white border border-border-faint text-neutral-800 shadow-xs rounded-tl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <span
                    className={`block mt-1 text-[9px] ${
                      m.sender === "user" ? "text-neutral-400 text-right" : "text-neutral-400"
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-2.5 text-xs">
              <div className="w-6 h-6 rounded-6 bg-heat-12 text-heat-100 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-white border border-border-faint text-neutral-500 rounded-12 px-3 py-2 flex items-center gap-1.5 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-heat-100 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-heat-100 animate-pulse delay-150" />
                <span className="w-1.5 h-1.5 rounded-full bg-heat-100 animate-pulse delay-300" />
                <span className="text-[10px] text-neutral-400 ml-1">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-border-faint bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!conversationId || loading || !!initError}
              placeholder={initError ? "Publish agent first" : "Ask something..."}
              className="flex-1 px-3 py-2 rounded-8 border border-border-faint text-xs text-accent-black placeholder-neutral-400 focus:outline-hidden focus:border-heat-100 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || !conversationId || loading}
              className="p-2 rounded-8 bg-heat-100 text-white hover:bg-heat-100/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
