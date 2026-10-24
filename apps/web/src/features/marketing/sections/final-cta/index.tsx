import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import "@/features/marketing/styles/final-cta.css";

export function FinalCtaSection() {
  return <section id="get-started" className="marketing-final-cta-section" aria-labelledby="final-cta-heading">
    <div className="marketing-final-cta-container">
      <div className="marketing-final-cta-panel">
        <div className="marketing-final-cta-copy">
          <h2 id="final-cta-heading">Your next hire<br/>starts with<br/><em>a question.</em></h2>
          <p>Build an agent around the work you do every day.</p>
          <div className="marketing-final-cta-actions">
            <Link href="/register" className="marketing-final-cta-btn">Start building<ArrowRight size={18} aria-hidden="true"/></Link>
            <Link href="#developers" className="marketing-final-cta-docs-link">Read the docs<ArrowUpRight size={17} aria-hidden="true"/></Link>
          </div>
        </div>
        <div className="marketing-final-cta-artwork">
        <Image unoptimized className="marketing-final-cta-art" src="/marketing/final-cta/agent-ready.webp" width={1536} height={1024} sizes="(max-width:767px) 90vw, 550px" alt="Your agent, ready when you are: a white identity card and business sources in a desk holder" />
        <span className="marketing-final-cta-art-brand" aria-hidden="true"><BrandLogo size="70%" fillColor="#fff" /></span>
        </div>
      </div>
    </div>
  </section>;
}
