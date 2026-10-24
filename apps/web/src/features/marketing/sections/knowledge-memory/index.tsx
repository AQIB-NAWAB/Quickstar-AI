"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { CustomerMemory } from "./customer-memory";
import { SourceDialog } from "./source-dialog";
import "../../styles/knowledge-memory.css";

export function KnowledgeMemorySection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const addSourceRef = useRef<HTMLButtonElement>(null);

  return <section id="knowledge" aria-labelledby="knowledge-heading" className="marketing-knowledge-section">
    <div className="marketing-knowledge-container">
      <header className="marketing-knowledge-header">
        <p className="marketing-knowledge-eyebrow">KNOWLEDGE &amp; MEMORY</p>
        <h2 id="knowledge-heading">Your business,<br /><em>in every answer.</em></h2>
        <p className="marketing-knowledge-description">Grounded in your sources. Thoughtful about what it remembers.</p>
      </header>
      <figure className="marketing-knowledge-book">
        <Image src="/marketing/knowledge-memory/business-knowledge-book-neutral.webp" width={1642} height={958} unoptimized
          sizes="(max-width: 767px) 92vw, (min-width: 1240px) 600px, 48vw"
          alt="An open business knowledge book containing Booking policy, Services and pricing, Support guide, and Company handbook. The booking policy says appointments can be changed with at least 24 hours’ notice." />
      </figure>
      <div className="marketing-knowledge-response">
        <p className="marketing-knowledge-question-label">A customer asks</p>
        <p className="marketing-knowledge-question">Can I move my appointment?</p>
        <p className="marketing-knowledge-answer">Yes. You can reschedule up to 24 hours before your appointment.</p>
      </div>
      <CustomerMemory onAddSource={() => setDialogOpen(true)} addSourceRef={addSourceRef} />
    </div>
    <SourceDialog open={dialogOpen} onClose={() => setDialogOpen(false)} triggerRef={addSourceRef} />
  </section>;
}
