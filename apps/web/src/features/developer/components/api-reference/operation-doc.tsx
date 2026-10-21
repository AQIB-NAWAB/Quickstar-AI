"use client";

import { Check, Copy, KeyRound, Shield } from "lucide-react";
import { useState } from "react";
import { type OpenApiOperation } from "../../lib/types";

interface OperationDocProps {
  operation: OpenApiOperation;
}

export function OperationDoc({ operation }: OperationDocProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "responses">("overview");
  const [codeLang, setCodeLang] = useState<"curl" | "typescript">("curl");
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const getCurlSnippet = (op: OpenApiOperation) => {
    const methodFlag =
      op.method.toUpperCase() === "GET" ? "" : `-X ${op.method.toUpperCase()} `;
    const authHeader = ` \\\n  -H "Authorization: Bearer YOUR_WORKSPACE_TOKEN"`;
    const jsonHeader = ["post", "patch", "put"].includes(op.method)
      ? ` \\\n  -H "Content-Type: application/json"`
      : "";
    const bodyFlag =
      op.requestBody?.example && ["post", "patch", "put"].includes(op.method)
        ? ` \\\n  -d '${JSON.stringify(op.requestBody.example)}'`
        : "";

    return `curl -sSL "https://api.quickstart.ai${op.path}" ${methodFlag}${authHeader}${jsonHeader}${bodyFlag}`.trim();
  };

  const getTypeScriptSnippet = (op: OpenApiOperation) => {
    const isGet = op.method.toUpperCase() === "GET";
    if (isGet) {
      return `import { QuickStartClient } from "@quickstart/sdk";

const client = new QuickStartClient({ token: process.env.QUICKSTART_API_KEY });
const result = await client.request("${op.method.toUpperCase()}", "${op.path}");
console.log(result);`;
    }

    return `import { QuickStartClient } from "@quickstart/sdk";

const client = new QuickStartClient({ token: process.env.QUICKSTART_API_KEY });
const result = await client.request("${op.method.toUpperCase()}", "${op.path}", {
  body: ${JSON.stringify(op.requestBody?.example || {}, null, 2)}
});
console.log(result);`;
  };

  const activeCode =
    codeLang === "curl"
      ? getCurlSnippet(operation)
      : getTypeScriptSnippet(operation);

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(activeCode);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleCopyResponse = () => {
    if (!operation.responseExample) return;
    navigator.clipboard.writeText(
      JSON.stringify(operation.responseExample.body, null, 2),
    );
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  const methodColor =
    operation.method.toUpperCase() === "GET"
      ? "bg-[#E9F9EF] text-[#027A48] border-[#A6F4C5]"
      : operation.method.toUpperCase() === "POST"
        ? "bg-[#FFF4ED] text-[#FF571A] border-[#FEDF89]"
        : operation.method.toUpperCase() === "DELETE"
          ? "bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]"
          : "bg-[#F8F9FB] text-[#71717A] border-[#EAECF0]";

  return (
    <div className="flex flex-col h-full rounded-12 border border-[#EAECF0] bg-white p-5 space-y-5 overflow-y-auto text-xs text-[#18181B]">
      {/* Operation Header matching Image 5 */}
      <div className="space-y-2 border-b border-[#EAECF0] pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`rounded-6 px-2.5 py-0.5 font-mono text-xs font-bold border ${methodColor}`}
          >
            {operation.method.toUpperCase()}
          </span>
          <span className="font-mono text-sm font-semibold text-[#18181B]">
            {operation.path}
          </span>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-[#18181B]">
          {operation.summary}
        </h2>

        {operation.description && (
          <p className="text-xs text-[#52525B] leading-relaxed">
            {operation.description}
          </p>
        )}

        {/* Security & Required Permissions badge */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {operation.security && operation.security.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F8F9FB] border border-[#EAECF0] text-[11px] text-[#52525B]">
              <Shield className="w-3 h-3 text-[#71717A]" />
              <span>{operation.security.join(", ")}</span>
            </div>
          )}

          {operation.requiredPermission && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#FFF4ED] border border-[#FEDF89] text-[11px] font-mono font-medium text-[#B54708]">
              <KeyRound className="w-3 h-3 text-[#FF571A]" />
              <span>Scope: {operation.requiredPermission}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-[#EAECF0] text-xs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-2 font-semibold transition-colors relative ${
            activeTab === "overview"
              ? "text-[#FF571A]"
              : "text-[#71717A] hover:text-[#18181B]"
          }`}
        >
          Overview
          {activeTab === "overview" && (
            <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#FF571A]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("responses")}
          className={`pb-2 font-semibold transition-colors relative ${
            activeTab === "responses"
              ? "text-[#FF571A]"
              : "text-[#71717A] hover:text-[#18181B]"
          }`}
        >
          Responses
          {activeTab === "responses" && (
            <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#FF571A]" />
          )}
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-5">
          {/* Parameters Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#18181B] uppercase tracking-wider">
              Request Parameters
            </h3>
            {operation.parameters && operation.parameters.length > 0 ? (
              <div className="overflow-hidden rounded-8 border border-[#EAECF0]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8F9FB] text-[11px] text-[#71717A] border-b border-[#EAECF0]">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">In</th>
                      <th className="px-3 py-2 font-semibold">Required</th>
                      <th className="px-3 py-2 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAECF0]">
                    {operation.parameters.map((p) => (
                      <tr key={p.name} className="hover:bg-[#F8F9FB]/50">
                        <td className="px-3 py-2 font-mono text-[11px] font-bold text-[#18181B]">
                          {p.name}
                        </td>
                        <td className="px-3 py-2 text-[#71717A]">{p.in}</td>
                        <td className="px-3 py-2">
                          {p.required ? (
                            <span className="text-[#B42318] font-bold text-[10px]">REQUIRED</span>
                          ) : (
                            <span className="text-[#A1A1AA] text-[10px]">OPTIONAL</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[#52525B]">
                          {p.description || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-[#71717A] italic">No path or query parameters required.</p>
            )}
          </div>

          {/* Request Body (if applicable) */}
          {operation.requestBody && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#18181B] uppercase tracking-wider">
                  Request Body
                </h3>
                <span className="text-[10px] font-mono text-[#71717A]">application/json</span>
              </div>
              {operation.requestBody.description && (
                <p className="text-xs text-[#52525B]">{operation.requestBody.description}</p>
              )}
              {operation.requestBody.example && (
                <div className="rounded-8 border border-[#EAECF0] bg-[#F8F9FB] p-3 font-mono text-[11px] text-[#18181B] overflow-x-auto">
                  <pre>{JSON.stringify(operation.requestBody.example, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {/* Code Example Snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#18181B] uppercase tracking-wider">
                Example Request
              </h3>
              <div className="flex items-center rounded-8 border border-[#EAECF0] bg-[#F8F9FB] p-0.5 text-[11px]">
                <button
                  onClick={() => setCodeLang("curl")}
                  className={`rounded-6 px-2.5 py-0.5 font-medium transition-colors ${
                    codeLang === "curl"
                      ? "bg-white text-[#18181B] shadow-xs"
                      : "text-[#71717A] hover:text-[#18181B]"
                  }`}
                >
                  cURL
                </button>
                <button
                  onClick={() => setCodeLang("typescript")}
                  className={`rounded-6 px-2.5 py-0.5 font-medium transition-colors ${
                    codeLang === "typescript"
                      ? "bg-white text-[#18181B] shadow-xs"
                      : "text-[#71717A] hover:text-[#18181B]"
                  }`}
                >
                  TypeScript
                </button>
              </div>
            </div>

            <div className="relative rounded-8 border border-[#EAECF0] bg-[#F8F9FB] p-3 font-mono text-xs text-[#18181B]">
              <pre className="overflow-x-auto whitespace-pre leading-relaxed">{activeCode}</pre>
              <button
                onClick={handleCopySnippet}
                className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-6 border border-[#EAECF0] bg-white px-2 py-1 text-[11px] text-[#71717A] hover:text-[#18181B] transition-colors shadow-xs"
              >
                {copiedSnippet ? (
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
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 200 OK Response Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-6 bg-[#E9F9EF] border border-[#A6F4C5] px-2 py-0.5 font-mono text-xs font-bold text-[#027A48]">
                  200 OK
                </span>
                <span className="text-xs text-[#71717A]">
                  {operation.responseExample?.description || "Successful operation"}
                </span>
              </div>

              {operation.responseExample && (
                <button
                  onClick={handleCopyResponse}
                  className="flex items-center gap-1 rounded-6 border border-[#EAECF0] bg-white px-2 py-1 text-[11px] text-[#71717A] hover:text-[#18181B] shadow-xs"
                >
                  {copiedResponse ? (
                    <>
                      <Check className="w-3 h-3 text-[#027A48]" />
                      <span className="text-[#027A48] font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="rounded-8 border border-[#EAECF0] bg-[#F8F9FB] p-3 font-mono text-[11px] text-[#18181B] overflow-x-auto max-h-72">
              <pre className="leading-relaxed">
                {operation.responseExample
                  ? JSON.stringify(operation.responseExample.body, null, 2)
                  : JSON.stringify({ success: true, message: "Standard OK response" }, null, 2)}
              </pre>
            </div>
          </div>

          {/* 401 Unauthorized */}
          <div className="space-y-2 pt-2 border-t border-[#EAECF0]">
            <div className="flex items-center gap-2">
              <span className="rounded-6 bg-[#FEF3F2] border border-[#FECDCA] px-2 py-0.5 font-mono text-xs font-bold text-[#B42318]">
                401 Unauthorized
              </span>
              <span className="text-xs text-[#71717A]">Authentication credentials missing or invalid</span>
            </div>
            <div className="rounded-8 border border-[#EAECF0] bg-[#F8F9FB] p-2.5 font-mono text-[11px] text-[#71717A]">
              &#123; &quot;error&quot;: &#123; &quot;code&quot;: &quot;UNAUTHORIZED&quot;, &quot;message&quot;: &quot;Not signed in or token expired&quot; &#125; &#125;
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
