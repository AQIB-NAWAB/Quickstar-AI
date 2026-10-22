"use client";

import { Check, Copy, Eye, EyeOff, Loader2, Play, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type OpenApiOperation } from "../../lib/types";

interface TryRequestConsoleProps {
  operation: OpenApiOperation;
  workspaceId: string;
  isPreview?: boolean;
}

export function TryRequestConsole({
  operation,
  workspaceId,
  isPreview = false,
}: TryRequestConsoleProps) {
  const [environment, setEnvironment] = useState<"gateway" | "live">("gateway");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [requestBodyText, setRequestBodyText] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseStatusText, setResponseStatusText] = useState<string>("");
  const [responseBody, setResponseBody] = useState<string | null>(null);
  const [responseLatency, setResponseLatency] = useState<number | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Re-initialize parameters and body when operation changes
  useEffect(() => {
    const initialParams: Record<string, string> = {
      workspaceId: workspaceId || "",
    };
    if (operation.parameters) {
      operation.parameters.forEach((p) => {
        if (p.name === "workspaceId") {
          initialParams[p.name] = workspaceId;
        } else if (p.schema?.default !== undefined) {
          initialParams[p.name] = String(p.schema.default);
        } else {
          initialParams[p.name] = "";
        }
      });
    }
    setParamValues(initialParams);

    if (operation.requestBody?.example) {
      setRequestBodyText(JSON.stringify(operation.requestBody.example, null, 2));
    } else {
      setRequestBodyText("");
    }

    setResponseBody(null);
    setResponseStatus(null);
    setResponseLatency(null);
    setRequestId(null);
  }, [operation, workspaceId]);

  const isMutation = ["post", "patch", "delete", "put"].includes(operation.method.toLowerCase());

  function handleSendClick() {
    if (isMutation && !isPreview) {
      setShowConfirmModal(true);
    } else {
      executeRequest();
    }
  }

  async function executeRequest() {
    setShowConfirmModal(false);
    setLoading(true);
    const startTime = performance.now();

    if (isPreview) {
      // Preview mode simulated execution
      setTimeout(() => {
        setLoading(false);
        setResponseStatus(operation.responseExample?.status ?? 200);
        setResponseStatusText("OK");
        setResponseLatency(142);
        setRequestId("req_preview_" + Math.random().toString(36).substring(2, 9));
        setResponseBody(
          JSON.stringify(
            operation.responseExample?.body ?? {
              success: true,
              message: "Preview simulated response",
            },
            null,
            2,
          ),
        );
      }, 350);
      return;
    }

    // Live Execution
    try {
      // Interpolate path parameters
      let resolvedPath = operation.path;
      Object.entries(paramValues).forEach(([k, v]) => {
        resolvedPath = resolvedPath.replace(`{${k}}`, encodeURIComponent(v));
      });

      // Construct query string for query parameters
      const queryParams = new URLSearchParams();
      if (operation.parameters) {
        operation.parameters
          .filter((p) => p.in === "query" && paramValues[p.name])
          .forEach((p) => {
            queryParams.set(p.name, paramValues[p.name]);
          });
      }
      const qs = queryParams.toString();
      const targetUrl = `${resolvedPath}${qs ? `?${qs}` : ""}`;

      const headers: Record<string, string> = {};
      if (token.trim()) {
        headers["Authorization"] = `Bearer ${token.trim()}`;
      }
      if (requestBodyText.trim() && isMutation) {
        headers["Content-Type"] = "application/json";
      }

      const res = await fetch(targetUrl, {
        method: operation.method.toUpperCase(),
        headers,
        body: isMutation && requestBodyText.trim() ? requestBodyText : undefined,
      });

      const latency = Math.round(performance.now() - startTime);
      setResponseLatency(latency);
      setResponseStatus(res.status);
      setResponseStatusText(res.statusText || (res.ok ? "OK" : "Error"));

      const traceId = res.headers.get("x-request-id") || res.headers.get("request-id");
      setRequestId(traceId);

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json().catch(() => ({}));
        setResponseBody(JSON.stringify(json, null, 2));
      } else {
        const text = await res.text().catch(() => "");
        setResponseBody(text || "(Empty response)");
      }
    } catch (err) {
      const latency = Math.round(performance.now() - startTime);
      setResponseLatency(latency);
      setResponseStatus(0);
      setResponseStatusText("Client Error");
      setResponseBody(
        JSON.stringify(
          {
            error: {
              code: "REQUEST_FAILED",
              message: err instanceof Error ? err.message : "Failed to execute request",
            },
          },
          null,
          2,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!responseBody) return;
    navigator.clipboard.writeText(responseBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col h-full rounded-12 border border-[#EAECF0] bg-white p-4 space-y-4 overflow-y-auto text-xs">
      {/* Title */}
      <div className="border-b border-[#EAECF0] pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#18181B]">Try-It Console</h2>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#F8F9FB] border border-[#EAECF0] text-[#52525B]">
            LIVE RUNNER
          </span>
        </div>
        <p className="font-mono text-[11px] text-[#71717A] mt-0.5">
          <span className="font-bold text-[#18181B] uppercase">{operation.method}</span>{" "}
          {operation.path}
        </p>
      </div>

      {/* Environment Selector */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-[#71717A]">Target Environment</label>
        <select
          value={environment}
          onChange={(e) => setEnvironment(e.target.value as "gateway" | "live")}
          className="w-full rounded-8 border border-[#EAECF0] bg-[#F8F9FB] px-2.5 py-1.5 text-xs text-[#18181B] focus:border-[#FF571A] focus:outline-none"
        >
          <option value="gateway">BFF / Local Gateway Proxy</option>
          <option value="live">Live Production (api.quickstart.ai)</option>
        </select>
      </div>

      {/* Authentication */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-[#71717A]">
            Bearer Token Authorization
          </label>
          <span className="text-[10px] text-[#71717A]">In-memory only</span>
        </div>

        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Auto-injected session cookie or custom Bearer token"
            className="w-full rounded-8 border border-[#EAECF0] bg-[#F8F9FB] py-1.5 pl-2.5 pr-8 font-mono text-[11px] text-[#18181B] placeholder:text-[#A1A1AA] focus:border-[#FF571A] focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            aria-label={showToken ? "Hide token" : "Show token"}
            className="absolute right-2.5 top-2 text-[#71717A] hover:text-[#18181B]"
          >
            {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Parameters */}
      {operation.parameters && operation.parameters.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-[#EAECF0]">
          <span className="text-[11px] font-semibold text-[#71717A] block">Parameters</span>
          <div className="space-y-2">
            {operation.parameters.map((p) => (
              <div key={p.name} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono text-[#18181B]">
                    {p.name} {p.required && <span className="text-red-500">*</span>}
                  </span>
                  <span className="text-[#71717A]">in: {p.in}</span>
                </div>
                <input
                  type="text"
                  value={paramValues[p.name] ?? ""}
                  onChange={(e) =>
                    setParamValues({ ...paramValues, [p.name]: e.target.value })
                  }
                  placeholder={p.description || p.name}
                  className="w-full rounded-6 border border-[#EAECF0] bg-[#F8F9FB] px-2 py-1 font-mono text-[11px] text-[#18181B] focus:border-[#FF571A] focus:bg-white focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Body Editor (for mutations) */}
      {isMutation && (
        <div className="space-y-1 pt-1 border-t border-[#EAECF0]">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-[#71717A]">
              Request Body (JSON)
            </label>
            <span className="text-[10px] text-[#71717A]">application/json</span>
          </div>
          <textarea
            value={requestBodyText}
            onChange={(e) => setRequestBodyText(e.target.value)}
            rows={5}
            className="w-full rounded-8 border border-[#EAECF0] bg-[#F8F9FB] p-2 font-mono text-[11px] text-[#18181B] focus:border-[#FF571A] focus:bg-white focus:outline-none leading-relaxed"
            placeholder="{}"
          />
        </div>
      )}

      {/* Send Button */}
      <div>
        <button
          type="button"
          onClick={handleSendClick}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-8 bg-[#FF571A] hover:bg-[#E0460D] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-white" />
          )}
          <span>{loading ? "Executing..." : "Send Request"}</span>
        </button>
      </div>

      {/* Response Viewer */}
      {responseStatus !== null ? (
        <div className="space-y-2 pt-2 border-t border-[#EAECF0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`font-mono px-2 py-0.5 rounded text-[10px] font-bold ${
                  responseStatus >= 200 && responseStatus < 300
                    ? "bg-[#E9F9EF] text-[#027A48] border border-[#A6F4C5]"
                    : "bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]"
                }`}
              >
                {responseStatus} {responseStatusText}
              </span>
              {responseLatency !== null && (
                <span className="text-[10px] font-mono text-[#71717A]">
                  {responseLatency}ms
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[11px] text-[#71717A] hover:text-[#18181B]"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-[#027A48]" />
                  <span className="text-[#027A48] font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {requestId && (
            <div className="text-[10px] font-mono text-[#71717A]">
              Request ID: {requestId}
            </div>
          )}

          <div className="relative rounded-8 border border-[#EAECF0] bg-[#F8F9FB] p-2.5 font-mono text-[11px] text-[#18181B] max-h-56 overflow-y-auto">
            <pre className="whitespace-pre-wrap leading-relaxed">
              {responseBody || "(Empty response)"}
            </pre>
          </div>
        </div>
      ) : (
        <div className="rounded-8 border border-[#EAECF0] bg-[#F8F9FB] p-4 text-center text-[11px] text-[#71717A]">
          Click &ldquo;Send Request&rdquo; to execute this call in real time.
        </div>
      )}

      {/* State Mutation Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm API mutation"
            className="bg-white border border-[#EAECF0] rounded-12 p-5 max-w-sm w-full shadow-xl space-y-3 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#EAECF0]">
              <div className="flex items-center gap-2 text-[#B42318] font-bold text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>Confirm Live Mutation</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-[#71717A] hover:text-[#18181B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[#52525B] leading-relaxed">
              You are about to execute a live state mutation:
              <br />
              <strong className="font-mono text-[#18181B] block mt-1">
                {operation.method.toUpperCase()} {operation.path}
              </strong>
              This will create or modify actual workspace data on the active backend.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAECF0]">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3 py-1.5 border border-[#EAECF0] rounded-8 text-[#52525B] hover:bg-[#F8F9FB] font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRequest}
                className="px-3.5 py-1.5 bg-[#FF571A] hover:bg-[#E0460D] text-white rounded-8 font-semibold shadow-xs transition-colors"
              >
                Confirm &amp; Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
