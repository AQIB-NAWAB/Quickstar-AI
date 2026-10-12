"use client";

import { Check,Copy,Shield } from "lucide-react";
import { useState } from "react";
import { type OpenApiOperation } from "../../lib/types";

interface OperationDocProps {
  operation: OpenApiOperation;
}

export function OperationDoc({ operation }: OperationDocProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "responses">("overview");
  const [codeLang, setCodeLang] = useState<"curl" | "typescript">("curl");
  const [copied, setCopied] = useState(false);

  const getCurlSnippet = (op: OpenApiOperation) => {
    const methodFlag =
      op.method.toUpperCase() === "GET"
        ? ""
        : `-X ${op.method.toUpperCase()} `;
    const authHeader = op.security?.length
      ? ` \\\n  -H "Authorization: Bearer YOUR_TOKEN"`
      : "";

    return `curl http://localhost:3000${op.path} ${methodFlag}${authHeader}`.trim();
  };

  const getTypeScriptSnippet = (op: OpenApiOperation) => {
    const isGet = op.method.toUpperCase() === "GET";
    const authHeader = op.security?.length
      ? `,
  headers: { Authorization: \`Bearer \${token}\` },`
      : "";

    if (isGet) {
      return `const response = await fetch("http://localhost:3000${op.path}"${
        op.security?.length
          ? `, {
  headers: { Authorization: \`Bearer \${token}\` },
}`
          : ""
      });
const data = await response.json();`;
    }

    return `const response = await fetch("http://localhost:3000${op.path}", {
  method: "${op.method.toUpperCase()}"${authHeader}
});
const data = await response.json();`;
  };

  const activeCode =
    codeLang === "curl"
      ? getCurlSnippet(operation)
      : getTypeScriptSnippet(operation);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-[#ededed] bg-white p-5 space-y-5 overflow-y-auto">
      {/* Operation Header */}
      <div className="space-y-2 border-b border-[#ededed] pb-4">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[#fa5d19] px-2 py-0.5 font-mono text-xs font-bold text-white">
            {operation.method.toUpperCase()}
          </span>
          <span className="font-mono text-sm font-semibold text-[#262626]">
            {operation.path}
          </span>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-[#262626]">
          {operation.summary}
        </h2>

        {operation.description && (
          <p className="text-xs text-[#737373] leading-relaxed">
            {operation.description}
          </p>
        )}

        {operation.security && operation.security.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            <Shield className="h-3.5 w-3.5 text-[#737373]" />
            <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-[#737373]">
              {operation.security.join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-[#ededed] text-xs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-2 font-medium transition-colors relative ${
            activeTab === "overview"
              ? "text-[#fa5d19]"
              : "text-[#737373] hover:text-[#262626]"
          }`}
        >
          Overview
          {activeTab === "overview" && (
            <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#fa5d19]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("responses")}
          className={`pb-2 font-medium transition-colors relative ${
            activeTab === "responses"
              ? "text-[#fa5d19]"
              : "text-[#737373] hover:text-[#262626]"
          }`}
        >
          Responses
          {activeTab === "responses" && (
            <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#fa5d19]" />
          )}
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-5">
          {/* Parameters */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold  text-[#737373]">
              Parameters
            </h3>
            {operation.parameters && operation.parameters.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-[#ededed] text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#f9f9f9] text-[11px] text-[#737373]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">In</th>
                      <th className="px-3 py-2 font-medium">Required</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ededed]">
                    {operation.parameters.map((p) => (
                      <tr key={p.name}>
                        <td className="px-3 py-2 font-mono text-[11px] font-semibold text-[#262626]">
                          {p.name}
                        </td>
                        <td className="px-3 py-2 text-[#737373]">{p.in}</td>
                        <td className="px-3 py-2">
                          {p.required ? (
                            <span className="text-red-500 font-medium">Yes</span>
                          ) : (
                            <span className="text-[#a3a3a3]">No</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[#737373]">
                          {p.description || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-[#737373] italic">No path parameters.</p>
            )}
          </div>

          {/* Schemas */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold  text-[#737373]">
              Schemas
            </h3>
            <div className="rounded-lg border border-[#ededed] bg-[#f9f9f9] p-3 text-xs text-[#737373]">
              Response schema is not specified in the current OpenAPI file.
            </div>
          </div>

          {/* Example Request */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold  text-[#737373]">
                Example request
              </h3>
              <div className="flex items-center rounded-lg border border-[#ededed] bg-[#f9f9f9] p-0.5 text-[11px]">
                <button
                  onClick={() => setCodeLang("curl")}
                  className={`rounded px-2 py-0.5 font-medium transition-colors ${
                    codeLang === "curl"
                      ? "bg-white text-[#262626] shadow-xs"
                      : "text-[#737373] hover:text-[#262626]"
                  }`}
                >
                  cURL
                </button>
                <button
                  onClick={() => setCodeLang("typescript")}
                  className={`rounded px-2 py-0.5 font-medium transition-colors ${
                    codeLang === "typescript"
                      ? "bg-white text-[#262626] shadow-xs"
                      : "text-[#737373] hover:text-[#262626]"
                  }`}
                >
                  TypeScript
                </button>
              </div>
            </div>

            <div className="relative rounded-lg border border-[#ededed] bg-[#f9f9f9] p-3 font-mono text-xs text-[#262626]">
              <pre className="overflow-x-auto whitespace-pre">{activeCode}</pre>
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

            <p className="text-[11px] text-[#a3a3a3]">
              Public gateway only. Internal service addresses are not part of this
              reference.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-green-50 px-2 py-0.5 font-mono text-xs font-semibold text-green-700">
                200 OK
              </span>
              <span className="text-xs text-[#737373]">Successful response</span>
            </div>
            <div className="rounded-lg border border-[#ededed] bg-[#f9f9f9] p-3 text-xs text-[#737373]">
              Response schema is not specified in the current OpenAPI file.
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs font-semibold text-[#737373]">
                401 Unauthorized
              </span>
              <span className="text-xs text-[#737373]">Authentication required</span>
            </div>
            <div className="rounded-lg border border-[#ededed] bg-[#f9f9f9] p-3 text-xs text-[#737373]">
              Missing or invalid bearer JWT session.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
