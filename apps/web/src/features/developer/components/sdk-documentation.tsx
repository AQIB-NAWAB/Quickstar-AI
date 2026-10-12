"use client";

import { AlertCircle,ArrowRight,Check,Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DeveloperSubnav } from "./developer-subnav";

interface SdkDocumentationProps {
  workspaceId: string;
  isPreview?: boolean;
}

export function SdkDocumentation({
  workspaceId,
  isPreview = false,
}: SdkDocumentationProps) {
  const [activeTab, setActiveTab] = useState<"quickstart" | "streaming" | "errors">(
    "quickstart"
  );
  const [copied, setCopied] = useState(false);

  const basePath = isPreview
    ? "/preview/developer"
    : `/workspaces/${workspaceId}/developer`;

  const quickstartCode = `const response = await fetch(
  "http://localhost:3000/v1/me",
  { headers: { Authorization: \`Bearer \${token}\` } }
);
const data = await response.json();`;

  const streamingCode = `// Streaming client planned for official SDK release
// SSE / WebSocket transport contracts will be specified in Phase 2
const stream = await client.conversations.stream({
  conversationId: "conv_123",
  message: "Hello assistant"
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}`;

  const errorsCode = `try {
  const response = await fetch("http://localhost:3000/v1/me", {
    headers: { Authorization: \`Bearer \${token}\` },
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.message || \`HTTP error \${response.status}\`);
  }

  const user = await response.json();
} catch (err) {
  console.error("Gateway request failed:", err);
}`;

  const getCode = () => {
    switch (activeTab) {
      case "quickstart":
        return quickstartCode;
      case "streaming":
        return streamingCode;
      case "errors":
        return errorsCode;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#262626]">
              Developer portal
            </h1>
            {isPreview && (
              <span className="rounded bg-[#fa5d19]/10 px-2 py-0.5 text-xs font-semibold text-[#fa5d19]">
                Sample data
              </span>
            )}
          </div>
          <p className="text-sm text-[#737373] mt-1">
            Integrate through the public API and inspect webhook delivery.
          </p>
        </div>
      </div>

      <DeveloperSubnav workspaceId={workspaceId} isPreview={isPreview} />

      {/* Main SDK Card */}
      <div className="rounded-xl border border-[#ededed] bg-white p-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-[#262626]">
              TypeScript SDK docs
            </h2>
            <span className="font-mono text-xs text-[#a3a3a3]">
              /developer/sdks
            </span>
          </div>
          <span className="rounded bg-[#fa5d19]/10 px-2.5 py-0.5 text-xs font-semibold text-[#fa5d19]">
            Planned
          </span>
        </div>

        {/* Notice */}
        <div className="flex items-center gap-2 rounded-lg border border-[#ededed] bg-[#f9f9f9] p-3 text-xs text-[#737373]">
          <AlertCircle className="h-4 w-4 text-[#fa5d19] shrink-0" />
          <span>
            SDK package is not available yet. REST examples are provided meanwhile.
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-[#ededed] text-xs">
          <button
            onClick={() => setActiveTab("quickstart")}
            className={`pb-2 font-medium transition-colors relative ${
              activeTab === "quickstart"
                ? "text-[#fa5d19]"
                : "text-[#737373] hover:text-[#262626]"
            }`}
          >
            Quickstart
            {activeTab === "quickstart" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#fa5d19]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("streaming")}
            className={`pb-2 font-medium transition-colors relative ${
              activeTab === "streaming"
                ? "text-[#fa5d19]"
                : "text-[#737373] hover:text-[#262626]"
            }`}
          >
            Streaming (planned)
            {activeTab === "streaming" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#fa5d19]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("errors")}
            className={`pb-2 font-medium transition-colors relative ${
              activeTab === "errors"
                ? "text-[#fa5d19]"
                : "text-[#737373] hover:text-[#262626]"
            }`}
          >
            Error handling
            {activeTab === "errors" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#fa5d19]" />
            )}
          </button>
        </div>

        {/* Code Snippet Box */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#737373]">
            {activeTab === "quickstart" && "Server-side REST example:"}
            {activeTab === "streaming" && "Planned streaming client interface:"}
            {activeTab === "errors" && "Standard REST error parsing:"}
          </div>

          <div className="relative rounded-lg border border-[#ededed] bg-[#f9f9f9] p-4 font-mono text-xs text-[#262626]">
            <pre className="overflow-x-auto whitespace-pre">{getCode()}</pre>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 flex items-center gap-1 rounded border border-[#ededed] bg-white px-2 py-1 text-[11px] text-[#737373] hover:text-[#262626] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-[#fa5d19]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 pt-2 text-xs">
          <Link
            href={`${basePath}/api-reference`}
            className="flex items-center gap-1 font-medium text-[#fa5d19] hover:underline"
          >
            <span>View API reference</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href={`${basePath}`}
            className="flex items-center gap-1 font-medium text-[#737373] hover:text-[#262626]"
          >
            <span>Authentication guide</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
