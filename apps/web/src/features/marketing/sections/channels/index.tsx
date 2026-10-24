"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { BrandLogo } from "@/components/brand/brand-logo";
import "../../styles/channels.css";

const channels = [
  { id: "website-chat", title: "Website chat", alt: "A furniture website with a customer asking about Saturday delivery and the agent answering yes." },
  { id: "inbound-calls", title: "Inbound calls", alt: "A white telephone and a conversation helping a caller book a time." },
  { id: "outbound-campaigns", title: "Outbound campaigns", alt: "A follow-up campaign with three contacts: answered, calling, and queued." },
  { id: "app-integration", title: "App Integration", alt: "A shopping app with an agent answering a customer's order question." },
  { id: "lead-generation", title: "Lead generation", alt: "A tray of business contact records with a highlighted lead and search icon." },
];

export function ChannelsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const scene = sceneRef.current;
    const hub = hubRef.current;
    const section = sectionRef.current;
    if (!scene || !hub || !section) return;
    let visible = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setActive(visible && !document.hidden && !motion.matches);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateMotion();
    });
    observer.observe(section);
    const measure = () => {
      // Layout coordinates stay stable while scroll reveals and hover scale the artwork.
      const position = (element: HTMLElement) => {
        let left = 0;
        let top = 0;
        let node: HTMLElement | null = element;
        while (node && node !== scene) {
          left += node.offsetLeft;
          top += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        return { left, top, width: element.offsetWidth, height: element.offsetHeight };
      };
      const source = position(hub);
      const y = source.top + source.height - 1;
      const compact = window.innerWidth < 700;
      setPaths(Array.from(scene.querySelectorAll<HTMLElement>(".channels-object")).map((item, index) => {
        const target = position(item);
        const x = source.left + source.width * (compact ? .5 : .14 + index * .18);
        const endX = compact ? target.left + 6 : target.left + target.width / 2;
        const endY = compact ? target.top + target.height / 2 : target.top + target.height * .16;
        if (!compact && window.innerWidth < 1100 && index >= 3) {
          const edge = index === 3 ? 2 : scene.offsetWidth - 2;
          return `M ${x} ${y} C ${x} ${y + 24}, ${edge} ${y + 18}, ${edge} ${y + 55} L ${edge} ${endY - 28} Q ${edge} ${endY}, ${endX} ${endY}`;
        }
        return compact
          ? `M ${x} ${y} C ${x} ${y + 24}, 8 ${y + 18}, 8 ${y + 55} L 8 ${endY - 22} Q 8 ${endY}, ${endX} ${endY}`
          : `M ${x} ${y} C ${x} ${y + 30}, ${endX} ${y + 18}, ${endX} ${endY}`;
      }));
    };
    const resize = new ResizeObserver(measure);
    resize.observe(scene);
    resize.observe(hub);
    scene.querySelectorAll(".channels-object").forEach(item => resize.observe(item));
    measure();
    motion.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateMotion);
    return () => {
      observer.disconnect(); resize.disconnect();
      motion.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateMotion);
    };
  }, []);

  return (
    <section ref={sectionRef} id="channels" aria-labelledby="channels-heading" className="channels-section" data-motion={active ? "running" : "paused"}>
      <div className="channels-container">
        <header className="channels-header-block">
          <h2 id="channels-heading" className="channels-heading">One agent. More ways to <em>get work done.</em></h2>
          <p className="channels-subparagraph">Chat, calls, campaigns, integrations, and leads. Connected to the same business knowledge.</p>
        </header>
        <div ref={sceneRef} className="channels-scene">
          <svg className="channels-connections" aria-hidden="true" width="100%" height="100%">
            {paths.map((path, index) => (
              <g key={channels[index].id}>
                <path d={path} className="channels-wire" />
                <path d={path} pathLength="100" className="channels-signal" style={{ animationDelay: `${index * -.85}s` }} />
              </g>
            ))}
          </svg>
          <div ref={hubRef} className="channels-agent">
            <span className="channels-agent-badge"><BrandLogo size={38} fillColor="#ffffff" aria-hidden="true" /></span>
            <div><strong>Your agent</strong><span>Knows your business</span></div>
          </div>
          <div className="channels-grid">
            {channels.map(channel => (
              <figure key={channel.id} className="channels-item" data-channel={channel.id}>
                <div className="channels-object">
                  <Image src={`/marketing/channels/${channel.id}${channel.id === "inbound-calls" ? "" : "-v2"}.webp`} alt={channel.alt} width={1254} height={1254} quality={95} sizes="(max-width: 699px) 88vw, (max-width: 1099px) 32vw, (min-width: 1240px) 230px, 20vw" />
                </div>
                <figcaption><h3>{channel.title}</h3></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
