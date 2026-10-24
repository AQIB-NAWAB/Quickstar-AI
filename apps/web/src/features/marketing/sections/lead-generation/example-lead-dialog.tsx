"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, FileText, MapPin, Building2, ExternalLink } from "lucide-react";
import { EXAMPLE_LEAD, type ExampleLeadData } from "../../content/lead-generation-example";

interface ExampleLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
  data?: ExampleLeadData;
}

export function ExampleLeadDialog({
  isOpen,
  onClose,
  triggerRef,
  data = EXAMPLE_LEAD,
}: ExampleLeadDialogProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll when open and restore on close/unmount
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

    // Shift focus into dialog
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

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="lead-research-dialog-overlay"
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
        aria-labelledby="example-lead-dialog-title"
        aria-describedby="example-lead-dialog-subtitle"
        className="lead-research-dialog-surface"
        tabIndex={-1}
      >
        {/* Dialog Header */}
        <div className="lead-research-dialog-header">
          <div className="lead-research-dialog-meta">
            <div className="lead-research-dialog-tags">
              <span className="lead-research-dialog-context-tag">
                {data.contextLabel}
              </span>
              <span className="lead-research-dialog-status-tag">
                <span className="lead-research-status-dot" aria-hidden="true" />
                {data.status}
              </span>
            </div>
            <h2
              id="example-lead-dialog-title"
              className="lead-research-dialog-title"
            >
              {data.title}
            </h2>
            <p
              id="example-lead-dialog-subtitle"
              className="lead-research-dialog-subtitle"
            >
              <MapPin className="lead-research-dialog-sub-icon" aria-hidden="true" />
              {data.subtitle}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="lead-research-dialog-close-btn"
            aria-label="Close example lead dialog"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Dialog Content */}
        <div className="lead-research-dialog-body">
          {/* Why it fits */}
          <section className="lead-research-dialog-section">
            <h3 className="lead-research-dialog-section-title">{data.whyItFitsTitle}</h3>
            <ul className="lead-research-dialog-fit-list">
              {data.whyItFits.map((item, idx) => (
                <li key={idx} className="lead-research-dialog-fit-item">
                  <CheckCircle2
                    className="lead-research-dialog-check-icon"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Evidence */}
          <section className="lead-research-dialog-section">
            <div className="lead-research-dialog-section-header">
              <h3 className="lead-research-dialog-section-title">{data.evidenceTitle}</h3>
              <span className="lead-research-dialog-evidence-badge">
                {data.evidence.length} sources matched
              </span>
            </div>

            <div className="lead-research-dialog-sources">
              {data.evidence.map((src, idx) => (
                <div key={idx} className="lead-research-dialog-source-card">
                  <div className="lead-research-dialog-source-header">
                    <FileText
                      className="lead-research-dialog-source-icon"
                      aria-hidden="true"
                    />
                    <span className="lead-research-dialog-source-title">{src.title}</span>
                  </div>
                  <p className="lead-research-dialog-source-excerpt">
                    “{src.excerpt}”
                  </p>
                  <div className="lead-research-dialog-source-url">
                    <span className="lead-research-dialog-source-label">Source:</span>
                    <span className="lead-research-dialog-source-plain">{src.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section className="lead-research-dialog-section">
            <h3 className="lead-research-dialog-section-title">{data.contactTitle}</h3>
            <div className="lead-research-dialog-contact-row">
              <Building2 className="lead-research-dialog-contact-icon" aria-hidden="true" />
              <span>{data.contact}</span>
            </div>
          </section>

          {/* Acceptance reason */}
          <section className="lead-research-dialog-section lead-research-dialog-section-accent">
            <h3 className="lead-research-dialog-section-title">
              {data.acceptanceReasonTitle}
            </h3>
            <p className="lead-research-dialog-reason-text">
              {data.acceptanceReason}
            </p>
          </section>
        </div>

        {/* Dialog Footer */}
        <div className="lead-research-dialog-footer">
          <button
            type="button"
            onClick={onClose}
            className="lead-research-dialog-done-btn"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
