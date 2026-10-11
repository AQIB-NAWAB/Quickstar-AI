"use client";

import {
AlertCircle,
Check,
Code2,
Copy,
ExternalLink,
FileCode2,
Webhook,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DeveloperSubnav } from "./developer-subnav";

interface DeveloperHomeProps {
  workspaceId: string;
  isPreview?: boolean;
}

export function DeveloperHome({
  workspaceId,
  isPreview = false,
}: DeveloperHomeProps) {
  const [copied, setCopied] = useState(false);

  const basePath = isPreview
    ? "/preview/developer"
    : `/workspaces/${workspaceId}/developer`;

  const quickstartCurl = `curl http://localhost:3000/v1/me \\\n  -H "Authorization: Bearer YOUR_TOKEN"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(quickstartCurl);
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

        <div className="flex items-center gap-2 rounded-lg border border-[#ededed] bg-white px-3 py-1.5 text-xs text-[#737373]">
          <AlertCircle className="h-4 w-4 text-[#fa5d19]" />
          <span>OpenAPI reference coverage is incomplete.</span>
        </div>
      </div>

      <DeveloperSubnav workspaceId={workspaceId} isPreview={isPreview} />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href={`${basePath}/api-reference`}
          className="group rounded-xl border border-[#ededed] bg-white p-5 transition-all hover:border-[#fa5d19]/40 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-[#fa5d19]/10 p-2.5 text-[#fa5d19]">
              <Code2 className="h-5 w-5" />
            </div>
            <ExternalLink className="h-4 w-4 text-[#a3a3a3] group-hover:text-[#fa5d19] transition-colors" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-[#262626]">
            API reference
          </h2>
          <p className="mt-1 text-xs text-[#737373] leading-relaxed">
            Browse public gateway operations, interactive try-it request console,
            and declared parameter schemas.
          </p>
        </Link>

        <Link
          href={`${basePath}/sdks`}
          className="group rounded-xl border border-[#ededed] bg-white p-5 transition-all hover:border-[#fa5d19]/40 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-[#fa5d19]/10 p-2.5 text-[#fa5d19]">
              <FileCode2 className="h-5 w-5" />
            </div>
            <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-[#737373]">
              Planned
            </span>
          </div>
          <h2 className="mt-4 text-base font-semibold text-[#262626]">
            SDK documentation
          </h2>
          <p className="mt-1 text-xs text-[#737373] leading-relaxed">
            Review server-side TypeScript REST patterns while official SDK
            packages are in development.
          </p>
        </Link>

        <Link
          href={`${basePath}/webhooks`}
          className="group rounded-xl border border-[#ededed] bg-white p-5 transition-all hover:border-[#fa5d19]/40 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-[#fa5d19]/10 p-2.5 text-[#fa5d19]">
              <Webhook className="h-5 w-5" />
            </div>
            <ExternalLink className="h-4 w-4 text-[#a3a3a3] group-hover:text-[#fa5d19] transition-colors" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-[#262626]">
            Webhook endpoints
          </h2>
          <p className="mt-1 text-xs text-[#737373] leading-relaxed">
            Configure delivery endpoints, platform event subscriptions, HMAC
            verification, and inspect delivery traces.
          </p>
        </Link>
      </div>

      {/* Quickstart Section */}
      <div className="rounded-xl border border-[#ededed] bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#262626]">
            Quick-start gateway request
          </h2>
          <span className="text-xs text-[#737373]">
            Default Gateway: http://localhost:3000
          </span>
        </div>
        <p className="text-xs text-[#737373]">
          Execute a sample authenticated query against the public gateway to
          verify your environment and authentication credentials.
        </p>

        <div className="relative rounded-lg border border-[#ededed] bg-[#f9f9f9] p-3 font-mono text-xs text-[#262626]">
          <pre className="overflow-x-auto whitespace-pre">{quickstartCurl}</pre>
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

        <p className="text-[11px] text-[#737373]">
          Public gateway only. Internal microservice addresses are not exposed
          for direct browser integration.
        </p>
      </div>
    </div>
  );
}
