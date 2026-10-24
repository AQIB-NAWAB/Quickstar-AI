"use client";

import React from "react";
import { MessageSquare, Phone, Code, CheckCircle, RotateCcw, ArrowRight } from "lucide-react";
import type { ChannelItem } from "../../content/how-it-works-steps";

interface PublishStepProps {
  channels: ChannelItem[];
  setChannels: React.Dispatch<React.SetStateAction<ChannelItem[]>>;
  isPublished: boolean;
  setIsPublished: React.Dispatch<React.SetStateAction<boolean>>;
}

export function PublishStep({
  channels,
  setChannels,
  isPublished,
  setIsPublished,
}: PublishStepProps) {
  const handleToggleChannel = (id: string) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handlePublish = () => {
    setIsPublished(true);
  };

  const handleRollback = () => {
    setIsPublished(false);
  };

  return (
    <div className="hiw-step-view hiw-publish-view">
      {/* Step Heading & Description */}
      <div className="hiw-step-header">
        <h3 className="hiw-step-heading">Choose where your agent works.</h3>
        <p className="hiw-step-description">
          Publish a version and switch on the channels you need.
        </p>
      </div>

      {/* Version Status Area */}
      <div className="hiw-version-card">
        <div className="hiw-version-header">
          <div className="flex items-center gap-3">
            <div className="hiw-version-row">
              <span className="hiw-version-tag">v4</span>
              <span
                className={`hiw-version-status ${
                  isPublished ? "hiw-version-previous" : "hiw-version-published"
                }`}
              >
                {isPublished ? "Previous version" : "Published"}
              </span>
            </div>
            <span className="hiw-version-arrow" aria-hidden="true">
              →
            </span>
            <div className="hiw-version-row">
              <span className="hiw-version-tag">v5</span>
              <span
                className={`hiw-version-status ${
                  isPublished ? "hiw-version-published" : "hiw-version-draft"
                }`}
              >
                {isPublished ? "Published (Live example)" : "Draft"}
              </span>
            </div>
          </div>

          <span className="hiw-version-badge">
            {isPublished ? "Live version 5" : "Draft in review"}
          </span>
        </div>

        <p className="hiw-version-note">
          {isPublished
            ? "Version 5 is now active in this preview session. Roll back anytime."
            : "Changes stay in your draft until you publish."}
        </p>

        {isPublished && (
          <div className="hiw-publish-confirmation" role="status">
            <CheckCircle className="w-4 h-4 text-[#16a34a] shrink-0" aria-hidden="true" />
            <span>Example version 5 published successfully.</span>
            <button
              type="button"
              onClick={handleRollback}
              className="hiw-rollback-link"
            >
              Roll back to v4
            </button>
          </div>
        )}
      </div>

      {/* Channel Rows */}
      <div className="hiw-channels-group">
        <p className="hiw-section-subhead">Connected channels</p>

        <div className="hiw-channels-list">
          {channels.map((chan) => {
            return (
              <div key={chan.id} className="hiw-channel-row">
                <div className="hiw-channel-left">
                  <div className="hiw-channel-icon-wrap" aria-hidden="true">
                    {chan.id === "chan-chat" ? (
                      <MessageSquare className="w-4 h-4 text-[#fa5d19]" />
                    ) : chan.id === "chan-phone" ? (
                      <Phone className="w-4 h-4 text-[#fa5d19]" />
                    ) : (
                      <Code className="w-4 h-4 text-[#fa5d19]" />
                    )}
                  </div>
                  <div>
                    <span className="hiw-channel-name">{chan.name}</span>
                    <p className="hiw-channel-desc">{chan.description}</p>
                  </div>
                </div>

                {/* Accessible switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={chan.enabled}
                  aria-label={`Toggle ${chan.name}`}
                  onClick={() => handleToggleChannel(chan.id)}
                  className={`hiw-switch ${chan.enabled ? "hiw-switch-on" : "hiw-switch-off"}`}
                >
                  <span className="hiw-switch-thumb" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
