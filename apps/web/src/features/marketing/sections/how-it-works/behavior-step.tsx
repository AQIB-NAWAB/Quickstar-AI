"use client";

import React from "react";
import { ArrowRight, Sparkles, Calendar, Clock } from "lucide-react";
import type { ExampleTool } from "../../content/how-it-works-steps";

interface BehaviorStepProps {
  instructions: string;
  setInstructions: (value: string) => void;
  tools: ExampleTool[];
  setTools: React.Dispatch<React.SetStateAction<ExampleTool[]>>;
}

export function BehaviorStep({
  instructions,
  setInstructions,
  tools,
  setTools,
}: BehaviorStepProps) {
  const handleToggleTool = (id: string) => {
    setTools((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  return (
    <div className="hiw-step-view hiw-behavior-view">
      {/* Step Heading & Description */}
      <div className="hiw-step-header">
        <h3 className="hiw-step-heading">Tell it how to help.</h3>
        <p className="hiw-step-description">
          Set its role, its tone and the actions it can take.
        </p>
      </div>

      {/* Editable Instructions Field */}
      <div className="hiw-instructions-group">
        <div className="hiw-instructions-header">
          <label htmlFor="agent-instructions-textarea" className="hiw-field-label">
            Instructions
          </label>
          <span className="hiw-field-badge">Local draft</span>
        </div>
        <textarea
          id="agent-instructions-textarea"
          rows={5}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="hiw-instructions-textarea"
          placeholder="Describe how the agent should handle customer inquiries..."
        />
      </div>

      {/* Available Actions / Tools */}
      <div className="hiw-tools-group">
        <p className="hiw-section-subhead">Available actions</p>

        <div className="hiw-tools-list">
          {tools.map((tool) => {
            return (
              <div key={tool.id} className="hiw-tool-row">
                <div className="hiw-tool-info">
                  <div className="hiw-tool-icon-wrap" aria-hidden="true">
                    {tool.identifier === "check_availability" ? (
                      <Clock className="w-4 h-4 text-[#fa5d19]" />
                    ) : (
                      <Calendar className="w-4 h-4 text-[#fa5d19]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="hiw-tool-name">{tool.name}</span>
                      <code className="hiw-tool-identifier">{tool.identifier}</code>
                    </div>
                    <p className="hiw-tool-desc">{tool.description}</p>
                  </div>
                </div>

                {/* Accessible switch button */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={tool.enabled}
                  aria-label={`Enable ${tool.name}`}
                  onClick={() => handleToggleTool(tool.id)}
                  className={`hiw-switch ${tool.enabled ? "hiw-switch-on" : "hiw-switch-off"}`}
                >
                  <span className="hiw-switch-thumb" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compact Workflow Sequence */}
      <div className="hiw-sequence-card">
        <span className="hiw-sequence-label">Action sequence:</span>
        <div className="hiw-sequence-steps">
          <span className="hiw-sequence-item">Understand request</span>
          <ArrowRight className="hiw-sequence-arrow" aria-hidden="true" />
          <span className="hiw-sequence-item">Check availability</span>
          <ArrowRight className="hiw-sequence-arrow" aria-hidden="true" />
          <span className="hiw-sequence-item hiw-sequence-item-accent">
            Confirm booking
          </span>
        </div>
      </div>
    </div>
  );
}
