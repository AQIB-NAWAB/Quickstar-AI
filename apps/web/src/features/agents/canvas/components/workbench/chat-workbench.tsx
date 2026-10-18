"use client";

import { FormattedChatMessage } from "@/features/agents/components/formatted-chat-message";
import React, { useState, useRef, useEffect } from "react";
import { Bot, RotateCcw, Send, User, Variable } from "lucide-react";
import type { GraphSessionState } from "@quickstart/contracts";

export type ChatMessageItem = {
  id: string;
  sender: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
};

export type ChatWorkbenchProps = {
  draftRevision: number;
  messages: ChatMessageItem[];
  sessionState: GraphSessionState | null;
  isLoading: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onResetSession: () => Promise<void>;
};

export const ChatWorkbench: React.FC<ChatWorkbenchProps> = ({
  draftRevision,
  messages,
  sessionState,
  isLoading,
  onSendMessage,
  onResetSession,
}) => {
  const [activeTab, setActiveTab] = useState<"chat" | "variables">("chat");
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const text = inputValue.trim();
    setInputValue("");
    try {
      await onSendMessage(text);
    } catch {
      setInputValue(text);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Workbench Subheader */}
      <div className="p-2.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex bg-neutral-200/60 p-0.5 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeTab === "chat"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Conversation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("variables")}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                activeTab === "variables"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <Variable className="w-3 h-3" />
              <span>Variables</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-neutral-500">
            Preview Draft r{draftRevision}
          </span>
        </div>

        <button
          type="button"
          onClick={onResetSession}
          disabled={isLoading}
          className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded transition-colors"
          title="Restart flow preview"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === "chat" ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 p-6">
                <Bot className="w-8 h-8 mb-2 stroke-1 text-neutral-400" />
                <p className="text-xs font-medium text-neutral-600">Ready to test conversation</p>
                <p className="text-[11px] text-neutral-400 mt-1 max-w-xs">
                  Type a greeting or reply below to test how your graph processes user turns.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.sender !== "user" && (
                    <div className="w-6 h-6 rounded-full bg-orange-100 text-[#FA5D19] flex items-center justify-center shrink-0 text-xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#FA5D19] text-white"
                        : "bg-neutral-100 text-neutral-800"
                    }`}
                  >
                    {msg.sender === "assistant" ? (
                      <FormattedChatMessage text={msg.text} />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                    <span className={`text-[9px] block text-right mt-1 opacity-70 font-mono`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {msg.sender === "user" && (
                    <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center shrink-0 text-xs">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-full bg-orange-100 text-[#FA5D19] flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-neutral-100 rounded-xl px-3.5 py-2 text-xs text-neutral-500 italic">
                  Agent is reasoning through the graph...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Composer */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-neutral-100 flex items-center gap-2 shrink-0 bg-neutral-50/50"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Send message to test agent..."
              disabled={isLoading}
              className="flex-1 text-xs bg-white border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FA5D19]"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-2 bg-[#FA5D19] hover:bg-[#FF571A] disabled:opacity-40 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        /* Variables Tab */
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider block mb-2">
              Captured Session Variables
            </span>
            {sessionState &&
            sessionState.variables &&
            Object.keys(sessionState.variables).length > 0 ? (
              <div className="rounded-lg border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
                {Object.entries(sessionState.variables).map(([key, val]) => (
                  <div key={key} className="p-2.5 flex items-center justify-between text-xs">
                    <span className="font-mono font-medium text-neutral-800">{key}</span>
                    <span className="font-mono text-neutral-600 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-150 max-w-[200px] truncate">
                      {typeof val === "object" ? JSON.stringify(val) : String(val ?? "")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-center text-xs text-neutral-400">
                No variables captured yet in this session.
              </div>
            )}
          </div>

          {sessionState && (
            <div className="text-[11px] text-neutral-500 space-y-1 pt-2 border-t border-neutral-100">
              <div>
                Session ID:{" "}
                <code className="text-neutral-700 font-mono">{sessionState.session_id}</code>
              </div>
              <div>
                Current Node:{" "}
                <code className="text-neutral-700 font-mono">{sessionState.current_node_id}</code>
              </div>
              <div>
                Status: <span className="font-semibold capitalize">{sessionState.status}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
