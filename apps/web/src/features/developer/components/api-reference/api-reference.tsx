"use client";

import { CheckCircle2, Code2, PlayCircle } from "lucide-react";
import { useState } from "react";
import { OPENAPI_OPERATIONS } from "../../lib/openapi";
import { DeveloperSubnav } from "../developer-subnav";
import { EndpointNavigation } from "./endpoint-navigation";
import { OperationDoc } from "./operation-doc";
import { TryRequestConsole } from "./try-request-console";

interface ApiReferenceProps {
  workspaceId: string;
  isPreview?: boolean;
}

export function ApiReference({
  workspaceId,
  isPreview = false,
}: ApiReferenceProps) {
  const [selectedId, setSelectedId] = useState("knowledge_list_sources");
  const [mobileTab, setMobileTab] = useState<"docs" | "console">("docs");

  const selectedOp =
    OPENAPI_OPERATIONS.find((op) => op.id === selectedId) ||
    OPENAPI_OPERATIONS[0];

  return (
    <div className="space-y-4">
      {/* Header matching Image 5 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#18181B]">
              Developer Portal &amp; API
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#E9F9EF] text-[#027A48] border border-[#A6F4C5]">
              <CheckCircle2 className="w-3 h-3" />
              OpenAPI 3.1 &middot; Active
            </span>
            {isPreview && (
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-[#FF571A] border border-orange-200">
                Sample preview
              </span>
            )}
          </div>
          <p className="text-xs text-[#71717A] mt-1">
            Programmatic REST APIs, webhook events, and client SDKs for workspace integration.
          </p>
        </div>
      </div>

      <DeveloperSubnav workspaceId={workspaceId} isPreview={isPreview} />

      {/* Mobile/Tablet Endpoint Selector & Segmented Tab (visible only < lg) */}
      <div className="block lg:hidden space-y-3 bg-white p-3 border border-[#EAECF0] rounded-12 shadow-xs">
        <div>
          <label className="text-[11px] font-semibold text-[#71717A] block mb-1">
            Selected API Endpoint
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full text-xs bg-[#F8F9FB] border border-[#EAECF0] rounded-8 p-2 font-mono text-[#18181B]"
          >
            {OPENAPI_OPERATIONS.map((op) => (
              <option key={op.id} value={op.id}>
                [{op.method.toUpperCase()}] {op.summary} ({op.path})
              </option>
            ))}
          </select>
        </div>

        {/* Segmented Tab: Documentation vs Try-It Console */}
        <div className="flex items-center p-1 bg-[#F8F9FB] rounded-8 border border-[#EAECF0]">
          <button
            type="button"
            onClick={() => setMobileTab("docs")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-6 flex items-center justify-center gap-1.5 transition-colors ${
              mobileTab === "docs"
                ? "bg-white text-[#18181B] shadow-xs"
                : "text-[#71717A] hover:text-[#18181B]"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Documentation</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("console")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-6 flex items-center justify-center gap-1.5 transition-colors ${
              mobileTab === "console"
                ? "bg-[#FF571A] text-white shadow-xs"
                : "text-[#71717A] hover:text-[#18181B]"
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Try-It Console</span>
          </button>
        </div>
      </div>

      {/* Responsive View for Mobile/Tablet */}
      <div className="block lg:hidden">
        {mobileTab === "docs" ? (
          <OperationDoc operation={selectedOp} />
        ) : (
          <TryRequestConsole
            operation={selectedOp}
            workspaceId={workspaceId}
            isPreview={isPreview}
          />
        )}
      </div>

      {/* 3-Column Desktop Grid (visible >= lg) */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-3 min-h-[580px] items-stretch">
        {/* Left Column: Endpoint Navigation */}
        <div className="min-w-0 lg:col-span-3">
          <EndpointNavigation
            operations={OPENAPI_OPERATIONS}
            selectedId={selectedId}
            onSelectOperation={setSelectedId}
          />
        </div>

        {/* Middle Column: Operation Documentation */}
        <div className="min-w-0 lg:col-span-5">
          <OperationDoc operation={selectedOp} />
        </div>

        {/* Right Column: Try Request Console */}
        <div className="min-w-0 lg:col-span-4">
          <TryRequestConsole
            operation={selectedOp}
            workspaceId={workspaceId}
            isPreview={isPreview}
          />
        </div>
      </div>
    </div>
  );
}
