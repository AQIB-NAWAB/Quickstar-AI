"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { INTEGRATION_ITEMS, type IntegrationItemData } from "./content";
import { renderIntegrationLogo } from "./logos";

const groups = [
  { label:"Intelligence", ids:["openai","anthropic","gemini","openrouter","ollama"] },
  { label:"Voice & calls", ids:["twilio","deepgram","cartesia","retell_ai","http_api"] },
  { label:"Your business", ids:["google_calendar","google_sheets","slack","notion","hubspot"] },
];

export function IntegrationScene({onSelectItem,isDialogOpen}:{onSelectItem:(item:IntegrationItemData,trigger:HTMLElement|null)=>void;isDialogOpen:boolean}) {
  const root=useRef<HTMLDivElement>(null);
  const [paths,setPaths]=useState<string[]>([]);
  const [inView,setInView]=useState(false);
  const [focused,setFocused]=useState(false);
  const [hidden,setHidden]=useState(false);
  useEffect(()=>{
    const el=root.current;if(!el)return;
    const measure=()=>{
      const box=el.getBoundingClientRect(); const card=el.querySelector('.marketing-integrations-agent')?.getBoundingClientRect();
      if(!card||box.width<900){setPaths([]);return;}
      const sx=el.clientWidth/box.width,sy=el.clientHeight/box.height;
      const endX=(card.left-box.left)*sx;
      setPaths(Array.from(el.querySelectorAll('.marketing-integrations-tool-row')).map((row,index)=>{
        const first=row.querySelector('.marketing-integrations-medallion-circle')?.getBoundingClientRect();
        const last=row.querySelector('.marketing-integrations-tool:last-child .marketing-integrations-medallion-circle')?.getBoundingClientRect();
        if(!first||!last)return '';
        const x=(first.left-box.left+first.width/2)*sx,y=(first.top-box.top+first.height/2)*sy;
        const bend=(last.right-box.left)*sx+12,endY=(card.top-box.top+card.height/2)*sy+(index-1)*23;
        return `M ${x} ${y} H ${bend} C ${bend+(endX-bend)*.55} ${y}, ${bend+(endX-bend)*.45} ${endY}, ${endX} ${endY}`;
      }));
    };
    const resize=new ResizeObserver(measure);resize.observe(el);measure();
    const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{threshold:.15});observer.observe(el);
    const visibility=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',visibility);
    return()=>{resize.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',visibility);};
  },[]);
  const paused=isDialogOpen||focused||!inView||hidden;
  return <div ref={root} className="marketing-integrations-map" onFocus={()=>setFocused(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}>
    <svg className="marketing-integrations-paths" width="100%" height="100%" aria-hidden="true">
      {paths.map((path,index)=><g key={index}><path d={path} fill="none" stroke="#d9d9d9" strokeWidth="1.2" /><circle r="3.5" fill="#fa5d19" className="marketing-integrations-signal" style={{offsetPath:`path('${path}')`,animationDelay:`-${index*2.8}s`,animationPlayState:paused?'paused':'running'} as CSSProperties} /></g>)}
    </svg>
    <div className="marketing-integrations-tool-groups">
      {groups.map(group=><div className="marketing-integrations-tool-row" key={group.label}>
        <h3>{group.label}</h3>
        {group.ids.map(id=>{const item=INTEGRATION_ITEMS.find(i=>i.id===id)!;return <button className="marketing-integrations-tool" key={id} type="button" aria-label={`View ${item.name} integration details`} onClick={e=>onSelectItem(item,e.currentTarget)}>
          <span className="marketing-integrations-medallion-circle" aria-hidden="true">{renderIntegrationLogo(id,28,"marketing-integrations-logo-svg")}</span>
          <span className="marketing-integrations-item-label">{item.name}</span>
        </button>;})}
      </div>)}
    </div>
    <div className="marketing-integrations-agent">
      <div className="marketing-integrations-agent-ports" aria-hidden="true"><i/><i/><i/></div>
      <span className="marketing-integrations-brand"><BrandLogo size={31} fillColor="#fff" /></span>
      <div><strong>Your agent</strong><span>Connected to your tools</span></div>
    </div>
  </div>;
}
