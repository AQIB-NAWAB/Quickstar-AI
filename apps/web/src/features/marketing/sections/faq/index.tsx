"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import { FAQ_ITEMS, DEFAULT_FAQ_ID } from "./faq-content";
import "../../styles/faq.css";

export function FaqSection() {
  const [openId,setOpenId]=useState<string|null>(DEFAULT_FAQ_ID);
  const buttons=useRef<Array<HTMLButtonElement|null>>([]);
  const navigate=(event:KeyboardEvent<HTMLButtonElement>,index:number)=>{
    const keys=["ArrowDown","ArrowUp","Home","End"];
    if(!keys.includes(event.key))return;
    event.preventDefault();
    const next=event.key==="Home"?0:event.key==="End"?FAQ_ITEMS.length-1:(index+(event.key==="ArrowDown"?1:-1)+FAQ_ITEMS.length)%FAQ_ITEMS.length;
    buttons.current[next]?.focus();
  };
  return <section id="faq" aria-labelledby="faq-heading" className="marketing-faq-section">
    <div className="marketing-faq-container">
      <header className="marketing-faq-intro">
        <p className="marketing-faq-eyebrow">FAQ</p>
        <h2 id="faq-heading">A few things<br/><em>you might ask.</em></h2>
        <p className="marketing-faq-description">Straight answers before you get started.</p>
        <Image unoptimized className="marketing-faq-art" src="/marketing/faq/question-answer.webp" width={1536} height={1024} sizes="(max-width:767px) 200px, 340px" alt="White question and answer tiles with an orange question mark" />
      </header>
      <div className="marketing-faq-accordion">
        {FAQ_ITEMS.map((item,index)=>{const open=openId===item.id;return <div className={`marketing-faq-item ${open?'is-open':''}`} key={item.id}>
          <h3><button ref={el=>{buttons.current[index]=el;}} id={`faq-trigger-${item.id}`} type="button" aria-expanded={open} aria-controls={`faq-answer-${item.id}`} onClick={()=>setOpenId(open?null:item.id)} onKeyDown={e=>navigate(e,index)}>
            <span>{item.question}</span><span className="marketing-faq-toggle" aria-hidden="true"><i/><i/></span>
          </button></h3>
          <div className="marketing-faq-answer" id={`faq-answer-${item.id}`} role="region" aria-labelledby={`faq-trigger-${item.id}`} aria-hidden={!open}>
            <div><p>{item.answerHeading} {item.answer}</p></div>
          </div>
        </div>;})}
      </div>
    </div>
  </section>;
}
