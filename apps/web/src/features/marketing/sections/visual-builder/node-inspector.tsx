"use client";

import React from "react";
import {
  Link2,
  Diamond,
  MessageSquare,
  FileText,
  User,
  Database,
  ArrowRight,
} from "lucide-react";
import type { BuilderNodeData } from "../../content/builder-graph";

interface NodeInspectorProps {
  node: BuilderNodeData;
  liveWelcomeMessage?: string;
  liveHandoffInstruction?: string;
}

export function NodeInspector({
  node,
  liveWelcomeMessage,
  liveHandoffInstruction,
}: NodeInspectorProps) {
  const inspector = node.inspector;

  const renderBadgeIcon = () => {
    if (inspector.badgeType === "start") {
      return (
        <span
          className="marketing-builder-inspector-dot marketing-builder-node-status-green"
          aria-hidden="true"
        />
      );
    }
    if (inspector.badgeType === "end") {
      return (
        <span
          className="marketing-builder-inspector-dot marketing-builder-node-status-red"
          aria-hidden="true"
        />
      );
    }

    const iconClasses = "marketing-builder-inspector-icon";

    switch (inspector.badgeType) {
      case "http":
        return <Link2 className={iconClasses} aria-hidden="true" />;
      case "condition":
        return <Diamond className={iconClasses} aria-hidden="true" />;
      case "message":
        return <MessageSquare className={iconClasses} aria-hidden="true" />;
      case "form":
        return <FileText className={iconClasses} aria-hidden="true" />;
      case "handoff":
        return <User className={iconClasses} aria-hidden="true" />;
      case "knowledge":
        return <Database className={iconClasses} aria-hidden="true" />;
      case "response":
        return <FileText className={iconClasses} aria-hidden="true" />;
      default:
        return <Link2 className={iconClasses} aria-hidden="true" />;
    }
  };

  const currentMessage =
    node.id === "welcome" && liveWelcomeMessage
      ? liveWelcomeMessage
      : inspector.message;

  const currentHandoffAction =
    node.id === "human_handoff" && liveHandoffInstruction
      ? liveHandoffInstruction
      : inspector.action;

  return (
    <aside
      className="marketing-builder-inspector"
      aria-label={`${node.title} step inspector`}
    >
      <div className="marketing-builder-inspector-header">
        <div className="marketing-builder-inspector-header-icon">
          {renderBadgeIcon()}
        </div>
        <div className="marketing-builder-inspector-header-text">
          <h3 className="marketing-builder-inspector-title">{inspector.title}</h3>
          <p className="marketing-builder-inspector-subtitle">
            {inspector.subtitle}
          </p>
        </div>
      </div>

      <div className="marketing-builder-inspector-divider" />

      <div className="marketing-builder-inspector-body">
        {/* Method & Endpoint for HTTP Request */}
        {inspector.method && (
          <div className="marketing-builder-inspector-row">
            <span className="marketing-builder-inspector-label">Method</span>
            <div className="marketing-builder-inspector-value font-mono">
              {inspector.method}
            </div>
          </div>
        )}

        {inspector.endpoint && (
          <div className="marketing-builder-inspector-row">
            <span className="marketing-builder-inspector-label">Endpoint</span>
            <div className="marketing-builder-inspector-value font-mono">
              {inspector.endpoint}
            </div>
          </div>
        )}

        {/* Inputs table */}
        {inspector.inputs && inspector.inputs.length > 0 && (
          <div className="marketing-builder-inspector-row">
            <span className="marketing-builder-inspector-label">Inputs</span>
            <div className="marketing-builder-inspector-inputs-table">
              {inspector.inputs.map((inp, idx) => (
                <div
                  key={idx}
                  className="marketing-builder-inspector-input-item"
                >
                  <span className="marketing-builder-inspector-input-key font-mono">
                    {inp.key}
                  </span>
                  <span className="marketing-builder-inspector-input-val">
                    {inp.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trigger */}
        {inspector.trigger && (
          <div className="marketing-builder-inspector-row">
            <span className="marketing-builder-inspector-label">Trigger</span>
            <div className="marketing-builder-inspector-value">
              {inspector.trigger}
            </div>
          </div>
        )}

        {/* Channels */}
        {inspector.channels && (
          <div className="marketing-builder-inspector-row">
            <span className="marketing-builder-inspector-label">Channels</span>
            <div className="marketing-builder-inspector-value">
              {inspector.channels}
            </div>
          </div>
        )}

        {/* Message */}
        {currentMessage && (
          <div className="marketing-builder-inspector-row">
            <span className="marketing-builder-inspector-label">Message</span>
            <div className="marketing-builder-inspector-value">
              {currentMessage}
            </div>
          </div>
        )}

        {/* Fields */}
        {inspector.fields && inspector.fields.length > 0 && (
          <div className="marketing-builder-inspector-row">
            <span className="marketing-builder-inspector-label">Fields</span>
            <div className="marketing-builder-inspector-tags">
              {inspector.fields.map((f, i) => (
                <span key={i} className="marketing-builder-inspector-tag">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Condition Rule & Branches */}
        {inspector.rule && (
          <>
            <div className="marketing-builder-inspector-row">
              <span className="marketing-builder-inspector-label">Rule</span>
              <div className="marketing-builder-inspector-value">
                {inspector.rule}
              </div>
            </div>
            {inspector.branchYes && (
              <div className="marketing-builder-inspector-row">
                <span className="marketing-builder-inspector-label">Yes</span>
                <div className="marketing-builder-inspector-value marketing-builder-inspector-link-val">
                  <ArrowRight
                    className="marketing-builder-arrow-val-icon"
                    aria-hidden="true"
                  />
                  <span>{inspector.branchYes}</span>
                </div>
              </div>
            )}
            {inspector.branchNeedsHelp && (
              <div className="marketing-builder-inspector-row">
                <span className="marketing-builder-inspector-label">
                  Needs help
                </span>
                <div className="marketing-builder-inspector-value marketing-builder-inspector-link-val">
                  <ArrowRight
                    className="marketing-builder-arrow-val-icon"
                    aria-hidden="true"
                  />
                  <span>{inspector.branchNeedsHelp}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Knowledge Source / Query / Result */}
        {inspector.source && (
          <div className="marketing-builder-inspector-row">
            <span className="marketing-builder-inspector-label">Source</span>
            <div className="marketing-builder-inspector-value">
              {inspector.source}
            </div>
          </div>
        )}
        {inspector.query && (
          <div className="marketing-builder-inspector-row">
            <span className="marketing-builder-inspector-label">Query</span>
            <div className="marketing-builder-inspector-value">
              {inspector.query}
            </div>
          </div>
        )}
        {inspector.result && (
          <div className="marketing-builder-inspector-row">
            <span className="marketing-builder-inspector-label">Result</span>
            <div className="marketing-builder-inspector-value">
              {inspector.result}
            </div>
          </div>
        )}
        {inspector.output && (
          <div className="marketing-builder-inspector-row">
            <span className="marketing-builder-inspector-label">Output</span>
            <div className="marketing-builder-inspector-value">
              {inspector.output}
            </div>
          </div>
        )}

        {/* Handoff Reason & Action */}
        {inspector.reason && (
          <div className="marketing-builder-inspector-row">
            <span className="marketing-builder-inspector-label">Reason</span>
            <div className="marketing-builder-inspector-value">
              {inspector.reason}
            </div>
          </div>
        )}
        {currentHandoffAction && (
          <div className="marketing-builder-inspector-row">
            <span className="marketing-builder-inspector-label">Action</span>
            <div className="marketing-builder-inspector-value">
              {currentHandoffAction}
            </div>
          </div>
        )}

        {/* Next step */}
        {inspector.nextStep && (
          <div className="marketing-builder-inspector-row">
            <span className="marketing-builder-inspector-label">Next step</span>
            <div className="marketing-builder-inspector-value marketing-builder-inspector-link-val">
              <ArrowRight
                className="marketing-builder-arrow-val-icon"
                aria-hidden="true"
              />
              <span>{inspector.nextStep}</span>
            </div>
          </div>
        )}
      </div>

      <div className="marketing-builder-inspector-footer">
        <span className="marketing-builder-inspector-helper">
          Example configuration
        </span>
      </div>
    </aside>
  );
}
