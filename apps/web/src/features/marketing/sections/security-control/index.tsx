"use client";

import Image from "next/image";
import { useState, useRef, useCallback } from "react";
import { LockKeyhole, UsersRound, Database, ArrowRight, ArrowUpRight } from "lucide-react";
import { TeamAccessPreview } from "./team-access-preview";
import { PREVIEW_MEMBERS, type WorkspaceRoleInfo } from "./content";
import { SecurityDialog, type SecurityDialogType } from "./security-dialog";
import "../../styles/security-control.css";

export function SecurityControlSection() {
  const [activeDialog, setActiveDialog] = useState<SecurityDialogType>(null);
  const [memberRoles, setMemberRoles] = useState<Record<string, WorkspaceRoleInfo["id"]>>(() => Object.fromEntries(PREVIEW_MEMBERS.map(m => [m.id, m.defaultRole])));
  const activeTriggerRef = useRef<HTMLElement | null>(null);
  const openDialog = (type: SecurityDialogType, trigger: HTMLElement | null) => { activeTriggerRef.current = trigger; setActiveDialog(type); };
  const closeDialog = useCallback(() => setActiveDialog(null), []);
  return (
    <section id="security" aria-labelledby="security-heading" className="marketing-security-section">
      <div className="marketing-security-container">
        <div className="marketing-security-copy">
          <header>
            <p className="marketing-security-eyebrow">Security &amp; control</p>
            <h2 id="security-heading">Your business stays<br /><em>your business.</em></h2>
            <p className="marketing-security-description">Choose who gets access. Keep your workspace in your hands.</p>
          </header>
          <ul className="marketing-security-benefits">
            <li><LockKeyhole aria-hidden="true" /><div><h3>A private workspace</h3><p>Your agents, conversations, and knowledge stay together.</p></div></li>
            <li><UsersRound aria-hidden="true" /><div><h3>The right access for each person</h3><p>Assign roles for building, reviewing, and replying.</p></div></li>
            <li><Database aria-hidden="true" /><div><h3>Credentials kept on your server</h3><p>Connect tools without putting secrets in the browser.</p></div></li>
          </ul>
          <nav className="marketing-security-actions" aria-label="Security resources">
            <button type="button" className="marketing-security-primary" onClick={e => openDialog("protect-data",e.currentTarget)}>How we protect your data <ArrowRight size={17} aria-hidden="true" /></button>
            <button type="button" className="marketing-security-contact" onClick={e => openDialog("requirements",e.currentTarget)}>Talk to us <ArrowUpRight size={17} aria-hidden="true" /></button>
          </nav>
        </div>
        <div className="marketing-security-visual">
          <Image unoptimized className="marketing-security-art" src="/marketing/security-control/protected-documents.webp" width={1459} height={1078} sizes="(max-width: 767px) 92vw, 600px" alt="White business documents protected by a shield with an orange lock and key" />
          <TeamAccessPreview memberRoles={memberRoles} onRoleChange={(id,role) => setMemberRoles(prev => ({...prev,[id]:role}))} onOpenManageAccess={el => openDialog("manage-access",el)} />
        </div>
      </div>
      <SecurityDialog memberRoles={memberRoles} setMemberRoles={setMemberRoles} type={activeDialog} isOpen={activeDialog !== null} onClose={closeDialog} triggerRef={activeTriggerRef} />
    </section>
  );
}
