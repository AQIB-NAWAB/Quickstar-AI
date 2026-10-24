"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { FileText, Paperclip, Send } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { MessageItem, SourceSnippet } from "../../content/demo-scenarios";

function AgentBadge() {
  return <span className="demo-agent-badge" aria-hidden="true"><BrandLogo size={26} fillColor="#fff" aria-hidden="true" /></span>;
}
function FormattedText({ text }: { text: string }) {
  return <>{text.split(/(30 days)/).map((part, index) => part === "30 days" ? <strong key={index}>{part}</strong> : part)}</>;
}
interface Props { messages: MessageItem[]; revealedCount: number; onSourceSelect: (source: SourceSnippet) => void }
export function ConversationPane({ messages, revealedCount, onSourceSelect }: Props) {
  const [input, setInput] = useState("");
  const [followUps, setFollowUps] = useState<{ sender: string; text: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight; }, [followUps, revealedCount]);
  const send = (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || sending) return;
    setFollowUps(previous => [...previous, { sender: "visitor", text: input.trim() }]);
    setInput(""); setSending(true);
    timer.current = setTimeout(() => {
      setFollowUps(previous => [...previous, { sender: "agent", text: "This preview follows a prepared example. Choose another scenario to explore a different conversation." }]);
      setSending(false);
    }, 600);
  };
  return <div className="demo-conversation-pane">
    <header className="demo-agent-header"><AgentBadge /><span>QuickStart agent</span></header>
    <div ref={list} className="demo-messages-container" aria-live="polite" aria-relevant="additions">
      {messages.slice(0, revealedCount).map(message => message.sender === "visitor" ?
        <div key={message.id} className="demo-visitor-row"><p className="demo-bubble-visitor">{message.text}</p><Image src="/marketing/use-cases/portrait-order.png" width={36} height={36} alt="Customer" className="demo-customer-avatar" /></div>
        : <div key={message.id} className="demo-agent-response-group"><AgentBadge /><div className="demo-response-card">
          {message.text && <p className="demo-response-main-text"><FormattedText text={message.text} /></p>}
          {message.supportingText && <p className="demo-response-supporting-text">{message.supportingText}</p>}
          {message.sources?.length ? <div className="demo-sources-row">{message.sources.slice(0, 1).map((source, index) => <button key={source.id} type="button" className="demo-source-link" onClick={() => onSourceSelect(source)} aria-label={`View citation for ${source.title}`}><FileText size={16} aria-hidden="true" />{source.title}{index === 0 ? " · page 2" : ""}</button>)}</div> : null}
          {message.appointment && <p className="demo-inline-outcome">{message.appointment.service} · {message.appointment.date} · {message.appointment.time}</p>}
          {message.lead && <p className="demo-inline-outcome">{message.lead.status} · {message.lead.need}</p>}
          {message.showHandoffButton && <><button className="demo-handoff-btn" type="button" disabled={handoff} onClick={() => setHandoff(true)}>{handoff ? "Handoff requested" : "Request a handoff"}</button>{handoff && <p className="demo-response-supporting-text">Your team would receive this conversation.</p>}</>}
        </div></div>)}
      {followUps.map((message, index) => <div key={index} className={message.sender === "visitor" ? "demo-visitor-row" : "demo-agent-response-group"}>{message.sender === "agent" && <AgentBadge />}<p className={message.sender === "visitor" ? "demo-bubble-visitor" : "demo-response-card"}>{message.text}</p></div>)}
      {sending && <p className="demo-preview-status" role="status">Preparing example response…</p>}
    </div>
    <form onSubmit={send} className="demo-input-bar">
      <Paperclip size={20} aria-hidden="true" className="demo-input-attachment" />
      <input className="demo-input-field" aria-label="Ask a follow-up question" placeholder="Ask a follow-up question" value={input} onChange={event => setInput(event.target.value)} disabled={sending} maxLength={1000} />
      <button type="submit" className="demo-send-btn" aria-label="Send example question" disabled={!input.trim() || sending}><Send size={19} aria-hidden="true" /></button>
    </form>
  </div>;
}
