"use client";

import { AlertCircle } from "lucide-react";
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
  const [selectedId, setSelectedId] = useState("auth_me");

  const selectedOp =
    OPENAPI_OPERATIONS.find((op) => op.id === selectedId) ||
    OPENAPI_OPERATIONS[2]; // default to auth_me

  return (
    <div className="space-y-4">
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

        <div className="flex items-center gap-2 rounded-lg border border-[#ededed] bg-white px-3 py-1.5 text-xs text-[#737373]">
          <AlertCircle className="h-4 w-4 text-[#fa5d19]" />
          <span>OpenAPI reference coverage is incomplete.</span>
        </div>
      </div>

      <DeveloperSubnav workspaceId={workspaceId} isPreview={isPreview} />

      {/* 3-Column Desktop Grid / Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[480px]">
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
          <TryRequestConsole operation={selectedOp} isPreview={isPreview} />
        </div>
      </div>
    </div>
  );
}
