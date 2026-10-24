"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, KeyRound, BookOpen, Code2, ShieldCheck, Check } from "lucide-react";

export type DeveloperDialogType = "keys" | "docs" | "api" | null;

interface DeveloperResourceDialogProps {
  type: DeveloperDialogType;
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function DeveloperResourceDialog({
  type,
  isOpen,
  onClose,
  triggerRef,
}: DeveloperResourceDialogProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll when open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
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
    }, 10);

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

  if (!mounted || !isOpen || !type) return null;

  const renderContent = () => {
    switch (type) {
      case "keys":
        return {
          title: "How keys work",
          icon: <KeyRound size={20} className="marketing-developers-dialog-icon" aria-hidden="true" />,
          body: (
            <div className="marketing-developers-dialog-body-content">
              <p className="marketing-developers-dialog-lead">
                Use a publishable key in the website widget and restrict it to your allowed origins. Keep server API keys private. Never put a secret API key in browser code.
              </p>
              <div className="marketing-developers-dialog-detail-box">
                <div className="marketing-developers-dialog-detail-item">
                  <div className="marketing-developers-dialog-detail-header">
                    <ShieldCheck size={16} aria-hidden="true" />
                    <strong>Publishable keys (pk_live_...)</strong>
                  </div>
                  <p>
                    Safe for public browser code. Requests are validated against the workspace allowed-origins list. The widget maintains the visitor’s conversation in browser storage.
                  </p>
                </div>
                <div className="marketing-developers-dialog-detail-item">
                  <div className="marketing-developers-dialog-detail-header">
                    <ShieldCheck size={16} aria-hidden="true" />
                    <strong>Server keys & credentials</strong>
                  </div>
                  <p>
                    Keep server API keys on your server. HTTP tool credentials are injected at call time from the workspace secrets vault.
                  </p>
                </div>
              </div>
            </div>
          ),
        };
      case "docs":
        return {
          title: "Documentation",
          icon: <BookOpen size={20} className="marketing-developers-dialog-icon" aria-hidden="true" />,
          body: (
            <div className="marketing-developers-dialog-body-content">
              <p className="marketing-developers-dialog-lead">
                Public developer documentation is currently in active preparation for launch.
              </p>
              <div className="marketing-developers-dialog-detail-box">
                <p className="marketing-developers-dialog-subheading">Integration overview:</p>
                <ul className="marketing-developers-dialog-list">
                  <li>
                    <Check size={14} aria-hidden="true" />
                    <span><strong>Website chat widget:</strong> Embed the script bundle, configure allowed origins, and start chatting with published agents.</span>
                  </li>
                  <li>
                    <Check size={14} aria-hidden="true" />
                    <span><strong>Custom tools:</strong> Register HTTP APIs and MCP servers once in Workspace settings, then attach them to agent workflows.</span>
                  </li>
                  <li>
                    <Check size={14} aria-hidden="true" />
                    <span><strong>Runtime credentials:</strong> Secret-backed authentication with automatic token injection via the workspace vault.</span>
                  </li>
                </ul>
              </div>
            </div>
          ),
        };
      case "api":
        return {
          title: "API Reference",
          icon: <Code2 size={20} className="marketing-developers-dialog-icon" aria-hidden="true" />,
          body: (
            <div className="marketing-developers-dialog-body-content">
              <p className="marketing-developers-dialog-lead">
                The public interactive OpenAPI documentation portal is being prepared for release.
              </p>
              <div className="marketing-developers-dialog-detail-box">
                <p className="marketing-developers-dialog-subheading">Verified platform endpoints (REST / OpenAPI 3.0):</p>
                <div className="marketing-developers-dialog-endpoint-list">
                  <div className="marketing-developers-dialog-endpoint-row">
                    <span className="marketing-developers-dialog-method-post">POST</span>
                    <code>/v1/workspaces/:id/conversations</code>
                  </div>
                  <div className="marketing-developers-dialog-endpoint-row">
                    <span className="marketing-developers-dialog-method-get">GET</span>
                    <code>/v1/workspaces/:id/agents</code>
                  </div>
                  <div className="marketing-developers-dialog-endpoint-row">
                    <span className="marketing-developers-dialog-method-post">POST</span>
                    <code>/v1/workspaces/:id/webhooks</code>
                  </div>
                </div>
                <p className="marketing-developers-dialog-footnote">
                  Request bodies, authentication and idempotency requirements vary by endpoint. Consult the documented contract before making a request.
                </p>
              </div>
            </div>
          ),
        };
    }
  };

  const content = renderContent();

  return createPortal(
    <div
      className="marketing-developers-dialog-overlay"
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
        aria-labelledby="marketing-developers-dialog-title"
        className="marketing-developers-dialog-card"
        tabIndex={-1}
      >
        <div className="marketing-developers-dialog-header">
          <div className="marketing-developers-dialog-title-group">
            {content.icon}
            <h3 id="marketing-developers-dialog-title">{content.title}</h3>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="marketing-developers-dialog-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="marketing-developers-dialog-body">
          {content.body}
        </div>

        <div className="marketing-developers-dialog-footer">
          <button
            type="button"
            className="marketing-developers-dialog-dismiss-btn"
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
