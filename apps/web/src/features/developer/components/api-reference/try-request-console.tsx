"use client";

import { Check,Copy,Eye,EyeOff,Play } from "lucide-react";
import { useState } from "react";
import { type OpenApiOperation } from "../../lib/types";

interface TryRequestConsoleProps {
  operation: OpenApiOperation;
  isPreview?: boolean;
}

export function TryRequestConsole({
  operation,
  isPreview = false,
}: TryRequestConsoleProps) {
  const [token, setToken] = useState("eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");
  const [showToken, setShowToken] = useState(false);
  const [authType, setAuthType] = useState("bearer");
  const [hasSent, setHasSent] = useState(isPreview); // Sample response belongs only to the development preview
  const [copied, setCopied] = useState(false);

  const sampleResponseBody = JSON.stringify(
    {
      user: {
        id: "user_demo",
        email: "alex@example.com",
      },
      organizations: [],
    },
    null,
    2
  );

  const handleSend = () => {
    setHasSent(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleResponseBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-[#ededed] bg-white p-5 space-y-4 overflow-y-auto">
      <div>
        <h2 className="text-sm font-bold text-[#262626]">Try request</h2>
        <p className="font-mono text-xs text-[#737373] mt-0.5">
          {operation.method.toUpperCase()} {operation.path}
        </p>
      </div>

      {/* Base URL */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[#737373]">Base URL</label>
        <input
          type="text"
          readOnly
          value="http://localhost:3000"
          className="w-full rounded-lg border border-[#ededed] bg-[#f9f9f9] px-3 py-1.5 font-mono text-xs text-[#262626] focus:outline-none"
        />
      </div>

      {/* Authentication */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[#737373]">
          Authentication
        </label>
        <select
          value={authType}
          onChange={(e) => setAuthType(e.target.value)}
          className="w-full rounded-lg border border-[#ededed] bg-white px-3 py-1.5 text-xs text-[#262626] focus:border-[#fa5d19] focus:outline-none"
        >
          <option value="bearer">Bearer token</option>
          <option value="none">No authentication</option>
        </select>

        {authType === "bearer" && (
          <div className="space-y-1 pt-1">
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter bearer JWT"
                className="w-full rounded-lg border border-[#ededed] bg-[#f9f9f9] py-1.5 pl-3 pr-8 font-mono text-xs text-[#262626] focus:border-[#fa5d19] focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                aria-label={showToken ? "Hide token" : "Show token"}
                className="absolute right-2.5 top-2 text-[#a3a3a3] hover:text-[#262626]"
              >
                {showToken ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-[#a3a3a3]">
              Token kept in memory only.
            </p>
          </div>
        )}
      </div>

      {/* Send button */}
      <div>
        <button
          type="button"
          onClick={handleSend}
          disabled={!isPreview}
          title={isPreview ? undefined : "The request console is not connected yet."}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa5d19] px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#e04f14] transition-colors"
        >
          <Play className="h-3.5 w-3.5 fill-white" />
          Send request
        </button>
      </div>

      {/* Response View */}
      {hasSent ? (
        <div className="space-y-2 pt-2 border-t border-[#ededed]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#737373]">
              {isPreview ? "Sample response" : "Response"}
            </span>
            <span className="rounded bg-green-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-green-700">
              200 OK
            </span>
          </div>

          <div className="relative rounded-lg border border-[#ededed] bg-[#f9f9f9] p-3 font-mono text-xs text-[#262626]">
            <pre className="overflow-x-auto whitespace-pre">
              {sampleResponseBody}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded border border-[#ededed] bg-white px-2 py-1 text-[11px] text-[#737373] hover:text-[#262626] transition-colors"
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
      ) : (
        <div className="rounded-lg border border-[#ededed] bg-[#f9f9f9] p-4 text-center text-xs text-[#a3a3a3]">
          No response yet.
        </div>
      )}
    </div>
  );
}
