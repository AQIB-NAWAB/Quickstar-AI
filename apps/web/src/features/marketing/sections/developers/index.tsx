"use client";

import React, { useState, useRef, useCallback } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { DeveloperCodePanel } from "./developer-code-panel";
import {
  DeveloperResourceDialog,
  type DeveloperDialogType,
} from "./developer-resource-dialog";
import "../../styles/developers.css";

export function DevelopersSection() {


  const [activeDialog, setActiveDialog] = useState<DeveloperDialogType>(null);
  const activeTriggerRef = useRef<HTMLElement | null>(null);

  const openDialog = (type: DeveloperDialogType, triggerEl: HTMLElement | null) => {
    activeTriggerRef.current = triggerEl;
    setActiveDialog(type);
  };

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
  }, []);

  return (
    <section

      id="developers"
      aria-labelledby="developers-heading"
      className="marketing-developers-section"
    >
      <div className="marketing-developers-container">
        <header className="marketing-developers-header">
          <p className="marketing-developers-eyebrow">For developers</p>
          <h2 id="developers-heading" className="marketing-developers-title">Connect it <em>your way.</em></h2>
          <p className="marketing-developers-description">A small embed. Your own tools. One connected agent.</p>
        </header>
        <DeveloperCodePanel />

        {/* Documentation Actions */}
        <div className="marketing-developers-actions">
          <button
            type="button"
            className="marketing-developers-btn marketing-developers-btn-primary"
            onClick={(e) => openDialog("docs", e.currentTarget)}
          >
            <span>Read the docs</span>
            <ArrowRight size={16} className="marketing-developers-btn-arrow" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="marketing-developers-btn marketing-developers-btn-secondary"
            onClick={(e) => openDialog("api", e.currentTarget)}
          >
            <span>View API reference</span>
            <ArrowUpRight size={16} className="marketing-developers-btn-arrow" aria-hidden="true" />
          </button>
        </div>

      </div>

      {/* Accessible Local Resource Dialog */}
      <DeveloperResourceDialog
        type={activeDialog}
        isOpen={activeDialog !== null}
        onClose={closeDialog}
        triggerRef={activeTriggerRef}
      />
    </section>
  );
}
