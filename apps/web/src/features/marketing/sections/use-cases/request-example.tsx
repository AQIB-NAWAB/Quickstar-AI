"use client";

import { useState } from "react";
import Image from "next/image";
import { CalendarDays, Clock3, MessageCircle, Moon, Package, Phone } from "lucide-react";
import type { UseCaseExample } from "./content";

const labels = ["Appointments", "Order support", "Lead qualification", "Follow-up calls", "After-hours support", "In-app help"];

function AppointmentPreview() {
  const [time,setTime]=useState("10:00 AM");
  return <div className="jobs-appointment">
    <div className="jobs-date"><span>Friday</span><strong>17</strong></div>
    <div className="jobs-times"><div role="group" aria-label="Preview appointment time">{["10:00 AM","10:30 AM","11:00 AM"].map(t=><button key={t} type="button" aria-pressed={time===t} onClick={()=>setTime(t)}>{t}</button>)}</div><p aria-live="polite"><CalendarDays size={14} aria-hidden="true" />Friday, {time}</p></div>
  </div>;
}

function Outcome({index}:{index:number}) {
  if(index===0)return <AppointmentPreview/>;
  if(index===1)return <div className="jobs-order"><Package size={43} strokeWidth={1.3} aria-hidden="true"/><div><p>Order #1042</p><div className="jobs-tracker" aria-label="Example order is in transit">{["Order found","In transit","Delivered"].map((label,i)=><span className={i===1?"current":""} key={label}><i/>{label}</span>)}</div></div></div>;
  if(index===2)return <div className="jobs-lead"><div className="jobs-lead-heading"><span className="jobs-company">NS</span><div><strong>Northstar Studio</strong><p>Design team · 24 people</p></div><span className="jobs-fit">Good fit</span></div><div className="jobs-lead-details"><span>Team size: 24</span><span>Needs: customer support</span></div></div>;
  if(index===3)return <div className="jobs-followup"><div className="jobs-audio"><span className="jobs-phone"><Phone size={25} fill="currentColor" aria-hidden="true"/></span><span className="jobs-wave" aria-hidden="true">{Array.from({length:25},(_,i)=><i key={i} style={{height:`${10+Math.round(Math.abs(Math.sin(i*1.7))*34)}px`,animationDelay:`${i*-.09}s`}}/>)}</span></div><p><Clock3 size={14} aria-hidden="true"/>Tomorrow, 9:30 AM</p></div>;
  if(index===4)return <div className="jobs-afterhours"><p><Moon size={20} fill="currentColor" aria-hidden="true"/>10:42 PM</p><div><span className="jobs-answer">Yes, I can help.</span><span className="jobs-typing" aria-label="Agent is typing"><i/><i/><i/></span></div></div>;
  return <div className="jobs-app"><div className="jobs-browser"><div className="jobs-browser-top"><i/><i/><i/></div><div className="jobs-skeleton"><span/><div><i/><i/><i/></div></div><span className="jobs-help">How can I help?</span><span className="jobs-launcher"><MessageCircle size={22} aria-hidden="true"/></span></div></div>;
}

export function RequestExample({example,index}:{example:UseCaseExample;index:number}) {
  return <article id={`use-case-${example.id}`} className="marketing-use-cases-card" aria-labelledby={`request-${example.id}`}>
    <header className="marketing-use-cases-request"><Image unoptimized src={example.portraitSrc} width={40} height={40} alt=""/><div><span>A customer asks</span><h3 id={`request-${example.id}`}>{example.question}</h3></div></header>
    <div className="marketing-use-cases-outcome"><Outcome index={index}/></div>
    <p className="marketing-use-cases-category">{labels[index]}</p>
  </article>;
}
