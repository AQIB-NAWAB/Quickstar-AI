"use client";

import React, { useState, useRef, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import { IntegrationScene } from "./integration-scene";
import {
  IntegrationDialog,
  type DialogViewMode,
} from "./integration-dialog";
import type { IntegrationItemData } from "./content";
import "../../styles/integrations.css";

export function IntegrationsSection() {



  // Modal dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogView, setDialogView] = useState<DialogViewMode>("detail");
  const [selectedItem, setSelectedItem] = useState<IntegrationItemData | null>(null);
  const activeTriggerRef = useRef<HTMLElement | null>(null);

  const handleSelectItem = useCallback(
    (item: IntegrationItemData, triggerEl: HTMLElement | null) => {
      activeTriggerRef.current = triggerEl;
      setSelectedItem(item);
      setDialogView("detail");
      setIsDialogOpen(true);
    },
    []
  );

  const handleOpenDirectory = (triggerEl: HTMLElement | null) => {
    activeTriggerRef.current = triggerEl;
    setSelectedItem(null);
    setDialogView("directory");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return (
    <section
     
      id="integrations"
      aria-labelledby="integrations-heading"
      className="marketing-integrations-section"
    >
      <div className="marketing-integrations-container">
        {/* Header Block */}
        <header className="marketing-integrations-header">
          <p className="marketing-integrations-eyebrow">Integrations</p>
          <h2 id="integrations-heading" className="marketing-integrations-title">The tools you trust.<br /><em>Connected to your agent.</em></h2>
          <p className="marketing-integrations-description">Bring your models, calls, and business tools into one conversation.</p>
        </header>

        {/* 3-track curved visual scene */}
        <div className="marketing-integrations-scene-wrapper">
          <IntegrationScene
            onSelectItem={handleSelectItem}
            isDialogOpen={isDialogOpen}
          />
        </div>

        {/* Primary CTA button */}
        <div className="marketing-integrations-cta-wrapper">
          <button
            type="button"
            onClick={(e) => handleOpenDirectory(e.currentTarget)}
            className="marketing-integrations-primary-cta"
            aria-label="Explore integrations directory"
          >
            <span>Explore integrations</span>
            <ArrowRight size={18} className="marketing-integrations-cta-arrow" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Accessible Integration Details / Directory Dialog */}
      <IntegrationDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        initialItem={selectedItem}
        initialView={dialogView}
        triggerRef={activeTriggerRef}
      />
    </section>
  );
}
