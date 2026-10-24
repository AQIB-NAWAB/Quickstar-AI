"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useRehearsalPlayback } from "../../lib/use-rehearsal-playback";
import { RehearsalPlayer } from "./rehearsal-player";
import "../../styles/voice-rehearsal.css";

export function VoiceRehearsalSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const playback = useRehearsalPlayback();
  const { setIsSectionInView } = playback;
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setIsSectionInView(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [setIsSectionInView]);

  return (
    <section ref={sectionRef} id="quality" aria-labelledby="quality-heading" className="marketing-rehearsal-section">
      <div className="marketing-rehearsal-container">
        <div className="marketing-rehearsal-intro">
          <header>
            <p className="marketing-rehearsal-eyebrow">Before you go live</p>
            <h2 id="quality-heading">Hear it before<br /><em>your customers do.</em></h2>
            <p className="marketing-rehearsal-description">Try a conversation. Fine-tune every reply.</p>
          </header>
          <figure className="marketing-rehearsal-art">
            <Image unoptimized src="/marketing/voice-rehearsal/studio-microphone.webp" width={1536} height={1024} sizes="(max-width: 767px) 90vw, 560px" alt="White studio microphone and speaker with orange audio accents" />
          </figure>
        </div>
        <RehearsalPlayer playback={playback} />
      </div>
    </section>
  );
}
