"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ShieldCheck, UserPlus, FileText, MessageSquare, Check, Copy, AlertCircle, RotateCcw } from "lucide-react";
import {
  WORKSPACE_ROLES,
  PREVIEW_MEMBERS,
  VERIFIED_SECURITY_FACTS,
  type WorkspaceRoleInfo,
} from "./content";

export type SecurityDialogType = "manage-access" | "protect-data" | "requirements" | null;

interface SecurityDialogProps {
  memberRoles: Record<string, WorkspaceRoleInfo["id"]>;
  setMemberRoles: React.Dispatch<React.SetStateAction<Record<string, WorkspaceRoleInfo["id"]>>>;
  type: SecurityDialogType;
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function SecurityDialog({
  memberRoles,
  setMemberRoles,
  type,
  isOpen,
  onClose,
  triggerRef,
}: SecurityDialogProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyRequestRef = useRef(0);
  const [announcement, setAnnouncement] = useState("");

  // Requirements dialog local draft state & clipboard copy state
  const [requirementsDraft, setRequirementsDraft] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Invalidate stale async copy feedback on close, draft edits and unmount.
  useEffect(() => {
    copyRequestRef.current += 1;
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopyStatus("idle");
    return () => {
      copyRequestRef.current += 1;
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, [isOpen, requirementsDraft]);

  // Lock background scroll when open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const background = Array.from(document.body.children).filter((node): node is HTMLElement =>
      node instanceof HTMLElement && !node.contains(dialogRef.current) && !node.hasAttribute("inert")
    );
    background.forEach(node => node.setAttribute("inert", ""));
    return () => {
      document.body.style.overflow = originalOverflow;
      background.forEach(node => node.removeAttribute("inert"));
    };
  }, [isOpen]);

  // Handle focus trapping, Escape key, and focus restoration
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      } else if (dialogRef.current) {
        dialogRef.current.focus();
      }
    }, 15);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        triggerRef?.current?.focus();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef?.current?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  const handleRoleChange = (memberId: string, newRole: WorkspaceRoleInfo["id"]) => {
    setMemberRoles((prev) => ({ ...prev, [memberId]: newRole }));
    const member = PREVIEW_MEMBERS.find(item => item.id === memberId);
    setAnnouncement(`${member?.name || "Member"} now previews the ${WORKSPACE_ROLES[newRole].name} role.`);
  };

  const handleResetRoles = () => {
    const initial: Record<string, WorkspaceRoleInfo["id"]> = {};
    PREVIEW_MEMBERS.forEach((m) => {
      initial[m.id] = m.defaultRole;
    });
    setMemberRoles(initial);
    setAnnouncement("Preview roles reset.");
  };

  const handleCopyRequirements = async () => {
    if (!requirementsDraft.trim()) return;
    const request = ++copyRequestRef.current;
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    try {
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(requirementsDraft);
      } catch {
        const previousFocus = document.activeElement as HTMLElement | null;
        const field = document.createElement("textarea");
        field.value = requirementsDraft;
        field.readOnly = true;
        field.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
        dialogRef.current?.appendChild(field);
        try {
          field.select();
          if (!document.execCommand("copy")) throw new Error("Clipboard denied");
        } finally {
          field.remove(); previousFocus?.focus({ preventScroll: true });
        }
      }
      if (request !== copyRequestRef.current) return;
      setCopyStatus("copied");
      copyTimerRef.current = setTimeout(() => setCopyStatus("idle"), 2500);
    } catch {
      if (request === copyRequestRef.current) setCopyStatus("failed");
    }
  };

  if (!mounted || !isOpen || !type) return null;

  const renderContent = () => {
    switch (type) {
      case "manage-access":
        return {
          title: "Manage access",
          description: "Preview how workspace roles affect access.",
          icon: <UserPlus size={20} className="marketing-security-dialog-icon" aria-hidden="true" />,
          body: (
            <div className="marketing-security-dialog-body-content">
              {/* Preview banner */}
              <div className="marketing-security-preview-notice" role="note">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>
                  This preview changes no real workspace permissions.
                </span>
              </div>

              {/* Members preview list */}
              <div className="marketing-security-members-list">
                {PREVIEW_MEMBERS.map((member) => {
                  const currentRoleKey = memberRoles[member.id] || member.defaultRole;
                  const currentRole = WORKSPACE_ROLES[currentRoleKey];
                  const isFixedOwner = member.defaultRole === "owner";

                  return (
                    <div key={member.id} className="marketing-security-member-row">
                      <div className="marketing-security-member-info">
                        <div className="marketing-security-member-avatar" aria-hidden="true">
                          {member.initials}
                        </div>
                        <div className="marketing-security-member-details">
                          <span className="marketing-security-member-name">{member.name}</span>
                          <span className="marketing-security-member-role-desc">
                            {currentRole.description}
                          </span>
                        </div>
                      </div>

                      <div className="marketing-security-member-controls">
                        {isFixedOwner ? (
                          <div className="marketing-security-role-fixed">
                            <span className="marketing-security-role-tag">Owner</span>
                            <span className="marketing-security-fixed-hint" title="Owner role is fixed in preview">
                              (Fixed)
                            </span>
                          </div>
                        ) : (
                          <label className="marketing-security-select-wrap">
                            <span className="sr-only">Role for {member.name}</span>
                            <select
                              aria-label={`Role for ${member.name}`}
                              value={currentRoleKey}
                              onChange={(e) =>
                                handleRoleChange(
                                  member.id,
                                  e.target.value as WorkspaceRoleInfo["id"]
                                )
                              }
                              className="marketing-security-role-select"
                            >
                              <option value="admin">Admin</option>
                              <option value="developer">Developer</option>
                              <option value="operator">Operator</option>
                              <option value="analyst">Analyst</option>
                              <option value="human_agent">Human Agent</option>
                            </select>
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reset preview action */}
              <div className="marketing-security-dialog-sub-actions">
                <button
                  type="button"
                  onClick={handleResetRoles}
                  className="marketing-security-reset-btn"
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>Reset preview roles</span>
                </button>
              </div>
            </div>
          ),
        };

      case "protect-data":
        return {
          title: "How we protect your data",
          description: "Verified platform isolation and credential encryption mechanisms.",
          icon: <FileText size={20} className="marketing-security-dialog-icon" aria-hidden="true" />,
          body: (
            <div className="marketing-security-dialog-body-content">
              <p className="marketing-security-dialog-lead">
                QuickStart AI maintains distinct tenant boundaries for each workspace and encrypts sensitive credentials at rest.
              </p>

              <div className="marketing-security-facts-grid">
                {VERIFIED_SECURITY_FACTS.map((fact, index) => (
                  <div key={index} className="marketing-security-fact-card">
                    <div className="marketing-security-fact-header">
                      <ShieldCheck size={16} className="marketing-security-fact-icon" aria-hidden="true" />
                      <h4 className="marketing-security-fact-title">{fact.title}</h4>
                    </div>
                    <p className="marketing-security-fact-detail">{fact.detail}</p>
                    
                  </div>
                ))}
              </div>


            </div>
          ),
        };

      case "requirements":
        return {
          title: "Your security requirements",
          description: "Public contact details are being prepared. You can draft the requirements you want to discuss.",
          icon: <MessageSquare size={20} className="marketing-security-dialog-icon" aria-hidden="true" />,
          body: (
            <div className="marketing-security-dialog-body-content">
              <p className="marketing-security-dialog-lead">
                Public enterprise contact details are currently being finalized. You can draft your compliance or architectural questions here and copy them to your clipboard.
              </p>

              <div className="marketing-security-draft-container">
                <label htmlFor="security-requirements-input" className="marketing-security-draft-label">
                  Requirements & questions
                </label>
                <textarea
                  id="security-requirements-input"
                  rows={5}
                  maxLength={1000}
                  value={requirementsDraft}
                  onChange={(e) => setRequirementsDraft(e.target.value)}
                  placeholder="Tell us about your access, data handling, or deployment requirements."
                  className="marketing-security-draft-textarea"
                />
                <div className="marketing-security-draft-counter">
                  <span>{requirementsDraft.length}/1000 characters</span>
                </div>
              </div>

              <div className="marketing-security-copy-row">
                <button
                  type="button"
                  onClick={handleCopyRequirements}
                  disabled={!requirementsDraft.trim()}
                  className="marketing-security-copy-btn"
                >
                  {copyStatus === "copied" ? (
                    <>
                      <Check size={15} aria-hidden="true" />
                      <span>Copied to clipboard</span>
                    </>
                  ) : copyStatus === "failed" ? (
                    <>
                      <AlertCircle size={15} aria-hidden="true" />
                      <span>Clipboard access denied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} aria-hidden="true" />
                      <span>Copy requirements</span>
                    </>
                  )}
                </button>
                <span className="marketing-security-copy-note">
                  No text is sent to any server or stored remotely.
                </span>
              </div>
            </div>
          ),
        };
    }
  };

  const content = renderContent();

  return createPortal(
    <div
      className="marketing-security-dialog-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="marketing-security-dialog-title"
        aria-describedby="marketing-security-dialog-desc"
        className="marketing-security-dialog-card"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="marketing-security-dialog-header">
          <div className="marketing-security-dialog-title-group">
            {content.icon}
            <div>
              <h3 id="marketing-security-dialog-title" className="marketing-security-dialog-title">
                {content.title}
              </h3>
              <p id="marketing-security-dialog-desc" className="marketing-security-dialog-subtitle">
                {content.description}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="marketing-security-dialog-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
        <span className="sr-only" role="status" aria-live="polite">{copyStatus === "copied" ? "Requirements copied." : copyStatus === "failed" ? "Copy failed. Select and copy your text manually." : ""}</span>
        {/* Body */}
        <div className="marketing-security-dialog-body">
          {content.body}
        </div>

        {/* Footer */}
        <div className="marketing-security-dialog-footer">
          <button
            type="button"
            className="marketing-security-dialog-dismiss-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
