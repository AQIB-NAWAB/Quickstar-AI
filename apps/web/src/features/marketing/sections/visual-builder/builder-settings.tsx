"use client";

import React from "react";
import type { TemplateSettingsDefaults } from "../../content/builder-graph";

interface BuilderSettingsProps {
  settings: TemplateSettingsDefaults;
  onChange: (updated: Partial<TemplateSettingsDefaults>) => void;
}

export function BuilderSettings({ settings, onChange }: BuilderSettingsProps) {
  return (
    <div
      className="marketing-builder-settings-view"
      role="tabpanel"
      id="builder-tabpanel-settings"
      aria-labelledby="builder-tab-settings"
    >
      <div className="marketing-builder-settings-card">
        <div className="marketing-builder-settings-header">
          <h3 className="marketing-builder-settings-title">Example Flow Settings</h3>
          <p className="marketing-builder-settings-notice">
            Changes apply to this example only.
          </p>
        </div>

        <div className="marketing-builder-settings-form">
          <div className="marketing-builder-settings-field">
            <label
              htmlFor="builder-setting-flowname"
              className="marketing-builder-settings-label"
            >
              Flow name
            </label>
            <input
              id="builder-setting-flowname"
              type="text"
              value={settings.flowName}
              onChange={(e) => onChange({ flowName: e.target.value })}
              className="marketing-builder-settings-input"
              placeholder="e.g. Appointment Assistant"
            />
          </div>

          <div className="marketing-builder-settings-field">
            <label
              htmlFor="builder-setting-welcome"
              className="marketing-builder-settings-label"
            >
              Welcome message
            </label>
            <textarea
              id="builder-setting-welcome"
              rows={2}
              value={settings.welcomeMessage}
              onChange={(e) => onChange({ welcomeMessage: e.target.value })}
              className="marketing-builder-settings-textarea"
              placeholder="Initial message sent to the visitor"
            />
          </div>

          <div className="marketing-builder-settings-field">
            <label
              htmlFor="builder-setting-handoff"
              className="marketing-builder-settings-label"
            >
              Handoff instruction
            </label>
            <textarea
              id="builder-setting-handoff"
              rows={2}
              value={settings.handoffInstruction}
              onChange={(e) => onChange({ handoffInstruction: e.target.value })}
              className="marketing-builder-settings-textarea"
              placeholder="Directive when passing conversation to a team member"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
