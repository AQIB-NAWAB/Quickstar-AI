"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Search, Check, ArrowLeft, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import {
  INTEGRATION_ITEMS,
  type IntegrationItemData,
} from "./content";
import { renderIntegrationLogo } from "./logos";

export type DialogViewMode = "detail" | "directory";

interface IntegrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem: IntegrationItemData | null;
  initialView: DialogViewMode;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function IntegrationDialog({
  isOpen,
  onClose,
  initialItem,
  initialView,
  triggerRef,
}: IntegrationDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<DialogViewMode>(initialView);
  const [activeItem, setActiveItem] = useState<IntegrationItemData | null>(initialItem);
  const [fromDirectory, setFromDirectory] = useState(initialView === "directory");
  const [searchQuery, setSearchQuery] = useState("");

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync props when opening
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setActiveItem(initialItem);
      setFromDirectory(initialView === "directory");
      setSearchQuery("");
    }
  }, [isOpen, initialItem, initialView]);

  // Lock background scroll and set inert on outside elements when open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const background = Array.from(document.body.children).filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement &&
        !node.contains(dialogRef.current) &&
        !node.hasAttribute("inert")
    );
    background.forEach((node) => node.setAttribute("inert", ""));

    return () => {
      document.body.style.overflow = originalOverflow;
      background.forEach((node) => node.removeAttribute("inert"));
    };
  }, [isOpen]);

  // Focus trap and Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (view === "directory" && searchInputRef.current) {
        searchInputRef.current.focus();
      } else if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      } else if (dialogRef.current) {
        dialogRef.current.focus();
      }
    }, 20);

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
  }, [isOpen, view, onClose, triggerRef]);

  // Filtered items in directory view
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return INTEGRATION_ITEMS;
    return INTEGRATION_ITEMS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.shortDescription.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelectItemFromDirectory = (item: IntegrationItemData) => {
    setActiveItem(item);
    setView("detail");
    setFromDirectory(true);
  };

  const handleBackToDirectory = () => {
    setView("directory");
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="marketing-integrations-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          triggerRef?.current?.focus();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="integrations-dialog-title"
        aria-describedby="integrations-dialog-desc"
        className="marketing-integrations-dialog-container"
        tabIndex={-1}
      >
        {/* Header bar */}
        <div className="marketing-integrations-dialog-header">
          <div className="marketing-integrations-dialog-header-left">
            {fromDirectory && view === "detail" && (
              <button
                type="button"
                onClick={handleBackToDirectory}
                className="marketing-integrations-back-btn"
                aria-label="Back to integrations directory"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                <span>All integrations</span>
              </button>
            )}
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => {
              onClose();
              triggerRef?.current?.focus();
            }}
            className="marketing-integrations-close-btn"
            aria-label="Close integrations dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Content body based on active view */}
        {view === "detail" && activeItem ? (
          <div className="marketing-integrations-detail-body">
            {/* Top provider identity bar */}
            <div className="marketing-integrations-detail-top">
              <div className="marketing-integrations-detail-icon-circle">
                {renderIntegrationLogo(activeItem.id, 44, "marketing-integrations-detail-logo")}
              </div>
              <div className="marketing-integrations-detail-titles">
                <div className="marketing-integrations-detail-tag-row">
                  <span className="marketing-integrations-category-pill">
                    {activeItem.category}
                  </span>
                  <span
                    className={`marketing-integrations-status-badge ${
                      activeItem.status === "operational"
                        ? "marketing-integrations-status-live"
                        : "marketing-integrations-status-planned"
                    }`}
                  >
                    <span className="marketing-integrations-status-dot" aria-hidden="true" />
                    <span>{activeItem.statusLabel}</span>
                  </span>
                </div>
                <h3
                  id="integrations-dialog-title"
                  className="marketing-integrations-detail-name"
                >
                  {activeItem.name}
                </h3>
              </div>
            </div>

            {/* Description */}
            <p
              id="integrations-dialog-desc"
              className="marketing-integrations-detail-description"
            >
              {activeItem.shortDescription}
            </p>

            {/* Supported capabilities */}
            <div className="marketing-integrations-capabilities-block">
              <h4 className="marketing-integrations-capabilities-title">
                {activeItem.status === "operational" ? "Capabilities" : "Planned capabilities"}
              </h4>
              <ul className="marketing-integrations-capabilities-list">
                {activeItem.supportedOperations.map((op, idx) => (
                  <li key={idx} className="marketing-integrations-capability-item">
                    <Check
                      size={15}
                      className="marketing-integrations-check-icon"
                      aria-hidden="true"
                    />
                    <span>{op}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Honest capability / status disclosure */}
            {activeItem.status !== "operational" ? (
              <div className="marketing-integrations-planned-notice">
                <AlertCircle
                  size={16}
                  className="marketing-integrations-alert-icon"
                  aria-hidden="true"
                />
                <p>
                  This integration is planned. It is not available to connect in this preview.
                </p>
              </div>
            ) : (
              <div className="marketing-integrations-verified-notice">
                <Sparkles
                  size={16}
                  className="marketing-integrations-sparkle-icon"
                  aria-hidden="true"
                />
                <p>
                  Availability depends on your workspace configuration. This preview does not connect an account.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Directory View */
          <div className="marketing-integrations-directory-body">
            <div className="marketing-integrations-directory-intro">
              <h3
                id="integrations-dialog-title"
                className="marketing-integrations-directory-title"
              >
                Explore integrations
              </h3>
              <p
                id="integrations-dialog-desc"
                className="marketing-integrations-directory-desc"
              >
                Find a tool and explore its capabilities.
              </p>
            </div>

            {/* Search filter input */}
            <div className="marketing-integrations-search-wrap">
              <Search
                size={16}
                className="marketing-integrations-search-icon"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search integrations by name or category…"
                aria-label="Filter integrations by name"
                className="marketing-integrations-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="marketing-integrations-search-clear"
                  aria-label="Clear search"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Results count announcement for screen readers */}
            <div aria-live="polite" className="sr-only">
              {filteredItems.length === 0
                ? "No integrations found matching your search."
                : `${filteredItems.length} integrations found.`}
            </div>

            {/* Directory list */}
            <div className="marketing-integrations-directory-list" role="list">
              {filteredItems.length === 0 ? (
                <div className="marketing-integrations-empty-results">
                  <p>No integrations found matching “{searchQuery}”.</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div key={item.id} role="listitem">
                  <button
                    type="button"
                    onClick={() => handleSelectItemFromDirectory(item)}
                    className="marketing-integrations-dir-card"
                  >
                    <div className="marketing-integrations-dir-card-icon">
                      {renderIntegrationLogo(item.id, 28)}
                    </div>
                    <div className="marketing-integrations-dir-card-info">
                      <div className="marketing-integrations-dir-card-name-row">
                        <span className="marketing-integrations-dir-card-name">
                          {item.name}
                        </span>
                        <span className="marketing-integrations-dir-card-category">
                          {item.category}
                        </span>
                      </div>
                      <p className="marketing-integrations-dir-card-desc">
                        {item.shortDescription}
                      </p>
                    </div>
                    <ArrowRight
                      size={16}
                      className="marketing-integrations-dir-card-arrow"
                      aria-hidden="true"
                    />
                  </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
