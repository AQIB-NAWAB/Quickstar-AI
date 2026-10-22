"use client";

import React, { useState } from "react";
import { Sparkles, Plus, ArrowRight, X, CheckCircle2, Layers } from "lucide-react";
import type { WorkflowTemplateItem } from "../../lib/types";

export type TemplateGalleryProps = {
  templates: WorkflowTemplateItem[];
  onSelectTemplate: (template: WorkflowTemplateItem) => void;
  onStartFromScratch: () => void;
  onClose?: () => void;
};

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  templates,
  onSelectTemplate,
  onStartFromScratch,
  onClose,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplateItem | null>(null);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Sales & Leads":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Support":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Customer Success":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Resolution":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Operations":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "Integrations":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-neutral-50 text-neutral-700 border-neutral-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
            Create New Workflow
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Start with an approved production template or build a custom DAG automation from scratch
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Hero Scratch Card */}
      <div
        onClick={onStartFromScratch}
        className="p-5 rounded-2xl border-2 border-dashed border-neutral-300 hover:border-[#FA5D19] bg-white hover:bg-orange-50/30 transition-all cursor-pointer flex items-center justify-between group shadow-xs"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#FA5D19] flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 group-hover:text-[#FA5D19] transition-colors">
              Start from Scratch
            </h3>
            <p className="text-xs text-neutral-500">
              Build a custom workflow graph from an empty canvas with your own triggers and steps.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 group-hover:text-[#FA5D19] transition-colors">
          <span>Blank Canvas</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Templates Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FA5D19]" />
          <h3 className="text-sm font-bold text-neutral-900">Pre-Built Automation Templates</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 bg-white rounded-2xl border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryColor(
                      tpl.category,
                    )}`}
                  >
                    {tpl.category}
                  </span>
                  {tpl.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600">
                      {tpl.badge}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-neutral-900 group-hover:text-[#FA5D19] transition-colors">
                    {tpl.name}
                  </h4>
                  <p className="text-xs text-neutral-500 line-clamp-3 mt-1 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{tpl.steps_count} steps</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(tpl)}
                    className="px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTemplate(tpl)}
                    className="px-3 py-1 bg-[#FA5D19] hover:bg-[#e04f12] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                  >
                    Use
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Template Preview Drawer / Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-[680px] max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryColor(
                    selectedTemplate.category,
                  )}`}
                >
                  {selectedTemplate.category}
                </span>
                <h3 className="text-sm font-bold text-neutral-900">{selectedTemplate.name}</h3>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-neutral-800">
              <div>
                <span className="font-bold text-neutral-900 block mb-1">Description</span>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {selectedTemplate.description}
                </p>
              </div>

              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2.5">
                <span className="font-bold text-neutral-900 block">Workflow Steps Sequence</span>
                <div className="space-y-2">
                  {selectedTemplate.graph.nodes.map((node, idx) => (
                    <div
                      key={node.id}
                      className="p-2.5 bg-white rounded-lg border border-neutral-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-neutral-900 block">{node.name}</span>
                          <span className="text-[10px] text-neutral-500 uppercase font-mono">
                            {node.type}
                          </span>
                        </div>
                      </div>
                      {node.subtitle && (
                        <span className="text-[11px] text-neutral-500 italic max-w-[200px] truncate">
                          {node.subtitle}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2 text-emerald-900">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Activation Checklist</span>
                </span>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-emerald-800">
                  <li>Trigger connects automatically to event: "{selectedTemplate.trigger_event_type}"</li>
                  <li>Pre-configured conditions and actions can be customized in the builder</li>
                  <li>Ready to test in dry-run mode immediately</li>
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 rounded-lg text-xs font-semibold text-neutral-700 transition-colors"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  onSelectTemplate(selectedTemplate);
                  setSelectedTemplate(null);
                }}
                className="px-5 py-2.5 bg-[#FA5D19] hover:bg-[#e04f12] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>Use This Template</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
