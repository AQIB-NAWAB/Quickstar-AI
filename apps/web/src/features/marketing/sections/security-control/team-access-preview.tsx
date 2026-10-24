"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LockKeyhole, UserPlus } from "lucide-react";
import { PREVIEW_MEMBERS, WORKSPACE_ROLES, type WorkspaceRoleInfo } from "./content";
type Role = WorkspaceRoleInfo["id"];
const portraits = ["/marketing/use-cases/portrait-appointment.png", "/marketing/human-handoff/avatar-alex.png", "/marketing/use-cases/portrait-lead.png"];

export function TeamAccessPreview({ memberRoles, onRoleChange, onOpenManageAccess }: {
  memberRoles: Record<string,Role>; onRoleChange:(id:string,role:Role)=>void; onOpenManageAccess:(el:HTMLElement|null)=>void;
}) {
  const [open,setOpen] = useState<string|null>(null);
  const [announcement,setAnnouncement] = useState("");
  const root=useRef<HTMLDivElement>(null);
  const triggers=useRef<Record<string,HTMLButtonElement|null>>({});
  useEffect(()=>{const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(null);}; document.addEventListener("pointerdown",close); return()=>document.removeEventListener("pointerdown",close);},[]);
  return <div ref={root} className="marketing-security-team-card">
    <h3>Your team</h3><p className="marketing-security-team-subtitle">Workspace access</p>
    <ul className="marketing-security-team-list">
      {PREVIEW_MEMBERS.map((member,index)=><li key={member.id}>
        <span className="marketing-security-person"><Image unoptimized src={portraits[index]} width={34} height={34} alt="" /><span>{member.name}</span></span>
        {member.defaultRole === "owner" ? <span className="marketing-security-preview-owner"><LockKeyhole size={13} aria-hidden="true" />Owner</span> :
        <div className="marketing-security-role-picker" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(null);}}>
          <button ref={el=>{triggers.current[member.id]=el;}} type="button" aria-label={`Preview role for ${member.name}: ${WORKSPACE_ROLES[memberRoles[member.id]].name}`} aria-haspopup="menu" aria-expanded={open===member.id} onClick={()=>setOpen(open===member.id?null:member.id)} onKeyDown={e=>{if(e.key==="ArrowDown"){e.preventDefault();setOpen(member.id);requestAnimationFrame(()=>root.current?.querySelector<HTMLElement>(`[data-role-menu="${member.id}"] button`)?.focus());}}}>
            {WORKSPACE_ROLES[memberRoles[member.id]].name}<ChevronDown size={14} aria-hidden="true" />
          </button>
          {open===member.id && <div role="menu" aria-label={`Roles for ${member.name}`} data-role-menu={member.id} className="marketing-security-role-menu" onKeyDown={e=>{const items=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'));const i=items.indexOf(document.activeElement as HTMLButtonElement);if(e.key==="Escape"){setOpen(null);triggers.current[member.id]?.focus();}if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){e.preventDefault();items[e.key==="Home"?0:e.key==="End"?items.length-1:(i+(e.key==="ArrowDown"?1:-1)+items.length)%items.length]?.focus();}}}>
            {Object.values(WORKSPACE_ROLES).filter(r=>r.id!=="owner").map(role=><button key={role.id} type="button" role="menuitemradio" aria-checked={memberRoles[member.id]===role.id} onClick={()=>{onRoleChange(member.id,role.id);setAnnouncement(`${member.name} now previews the ${role.name} role.`);setOpen(null);triggers.current[member.id]?.focus();}}>{role.name}{memberRoles[member.id]===role.id&&<Check size={13} aria-hidden="true" />}</button>)}
          </div>}
        </div>}
      </li>)}
    </ul>
    <button type="button" className="marketing-security-manage-btn" onClick={e=>onOpenManageAccess(e.currentTarget)}><UserPlus size={17} aria-hidden="true" />Manage access</button>
    <span className="sr-only" role="status">{announcement}</span>
  </div>;
}
