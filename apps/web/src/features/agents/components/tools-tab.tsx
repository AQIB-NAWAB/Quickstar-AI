"use client";

import { useState } from "react";
import {
  FileSearch,
  FileText,
  Mail,
  Package,
  Plug,
  Receipt,
  Trash2,
} from "lucide-react";
import type { AgentToolDefinition } from "../lib/types";
import { ToolSetupModal, type ToolTemplate } from "./tool-setup-modal";

type Props = {
  tools: AgentToolDefinition[];
  onRemoveTool: (toolName: string) => void;
  onSaveTool: (tool: AgentToolDefinition) => void;
  isDirty: boolean;
};

const TEMPLATES: ToolTemplate[] = [
  {
    id: "knowledge_search",
    name: "knowledge_search",
    label: "Knowledge search",
    description: "Find answers in company documents.",
    defaultMethod: "GET",
    defaultPathTemplate: "/v1/search?q={query}",
    defaultParameters: {
      type: "object",
      properties: { query: { type: "string", description: "Search query string" } },
      required: ["query"],
    },
  },
  {
    id: "order_lookup",
    name: "order_lookup",
    label: "Order lookup",
    description: "Retrieve an order's status and tracking.",
    defaultMethod: "GET",
    defaultPathTemplate: "/v1/orders/{order_id}",
    defaultParameters: {
      type: "object",
      properties: { order_id: { type: "string", description: "Customer order ID" } },
      required: ["order_id"],
    },
  },
  {
    id: "process_refund",
    name: "process_refund",
    label: "Process refund",
    description: "Connect your refund approval workflow.",
    defaultMethod: "POST",
    defaultPathTemplate: "/v1/refunds",
    defaultParameters: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "Order ID to refund" },
        reason: { type: "string", description: "Reason for refund" },
      },
      required: ["order_id"],
    },
  },
  {
    id: "followup_email",
    name: "send_followup_email",
    label: "Follow-up email",
    description: "Connect an email service for follow-ups.",
    defaultMethod: "POST",
    defaultPathTemplate: "/v1/emails/send",
    defaultParameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject" },
        body: { type: "string", description: "Email body content" },
      },
      required: ["to", "body"],
    },
  },
];

export function ToolsTab({
  tools,
  onRemoveTool,
  onSaveTool,
  isDirty,
}: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<ToolTemplate | null>(null);

  function getTemplateIcon(id: string) {
    switch (id) {
      case "knowledge_search":
        return <FileSearch className="w-5 h-5 text-[#344054]" />;
      case "order_lookup":
        return <Package className="w-5 h-5 text-[#344054]" />;
      case "process_refund":
        return <Receipt className="w-5 h-5 text-[#344054]" />;
      case "followup_email":
        return <Mail className="w-5 h-5 text-[#344054]" />;
      default:
        return <Plug className="w-5 h-5 text-[#344054]" />;
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-[24px] font-semibold text-[#202125]">Tools &amp; functions</h2>
          <p className="mt-1 text-[14px] text-[#667085]">
            Connect the actions your agent can use.
          </p>
        </div>

        {/* Section A: Attached Tools */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[18px] font-semibold text-[#202125]">Attached tools</h3>
            <span className="w-5 h-5 rounded-full bg-[#F2F4F7] text-[#344054] text-[12px] font-mono flex items-center justify-center font-medium">
              {tools.length}
            </span>
          </div>

          {tools.length === 0 ? (
            /* Empty State matching 4.png */
            <div className="rounded-lg border border-[#E1E5EA] bg-white min-h-[88px] px-6 py-4 flex items-center gap-5">
              <Plug className="w-7 h-7 text-[#667085] shrink-0" aria-hidden="true" />
              <div>
                <h4 className="text-[15px] font-medium text-[#202125]">No tools attached</h4>
                <p className="mt-1 text-[14px] text-[#667085]">
                  Set up a tool below to add it to this agent.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className="p-4 bg-white border border-[#E1E5EA] rounded-lg shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-[#202125]">
                        {tool.name}
                      </span>
                      {Boolean(tool.type) && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F2F4F7] text-[#667085]">
                          {String(tool.type)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[13px] text-[#667085] truncate">
                      {tool.description || "No description provided."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveTool(tool.name)}
                    aria-label={`Remove ${tool.name}`}
                    className="p-1.5 text-[#98A2B3] hover:text-[#B42318] hover:bg-red-50 rounded transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section B: Tool Templates matching 4.png */}
        <div className="space-y-3 pt-2">
          <div>
            <h3 className="text-[18px] font-semibold text-[#202125]">Tool templates</h3>
            <p className="text-[13px] text-[#667085] mt-0.5">
              Starting points that need a working connection.
            </p>
          </div>

          <div className="bg-white border border-[#E1E5EA] rounded-lg divide-y divide-[#EDF0F2] overflow-hidden shadow-sm">
            {TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                className="min-h-[76px] px-5 py-4 flex items-center justify-between gap-4 hover:bg-[#F8F9FA]/60 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    {getTemplateIcon(tmpl.id)}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[15px] font-medium text-[#202125] leading-tight">
                      {tmpl.label}
                    </span>
                    <span className="block text-[13px] text-[#667085] leading-tight mt-0.5">
                      {tmpl.description}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate(tmpl)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium text-[#202125] bg-white border border-[#E1E5EA] rounded-md hover:bg-[#F8F9FA] transition-colors shrink-0 shadow-sm cursor-pointer"
                >
                  Set up
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Helper */}
        <div className="pt-2 flex items-center gap-2 text-[13px] text-[#667085]">
          <FileText className="w-3.5 h-3.5 text-[#667085]" aria-hidden="true" />
          <span>
            {isDirty
              ? "Unsaved changes. Save your draft before publishing."
              : "Tool changes apply after you save and publish."}
          </span>
        </div>
      </div>

      <ToolSetupModal
        isOpen={Boolean(selectedTemplate)}
        onClose={() => setSelectedTemplate(null)}
        template={selectedTemplate}
        onSaveTool={(newTool) => {
          onSaveTool(newTool);
          setSelectedTemplate(null);
        }}
      />
    </>
  );
}
