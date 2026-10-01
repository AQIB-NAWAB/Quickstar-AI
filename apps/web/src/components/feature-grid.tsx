import { MessageSquare, PhoneCall, Database, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

export function FeatureGrid() {
  const features = [
    {
      id: "chat",
      endpoint: "services/conversation-service :3004",
      title: "Omnichannel Chat & Web Widget",
      subtitle: "Persistent Threads, Streaming & Seamless Human Handoff",
      desc: "Embed high-conversion chat widgets on your web apps. Features optimistic UI updates, typing state streaming, automated conversation indexing, and seamless human escalation without losing context.",
      icon: MessageSquare,
      badge: "Realtime Chat",
    },
    {
      id: "voice",
      endpoint: "services/voice-service :3008",
      title: "Realtime Voice Telephony",
      subtitle: "Sub-400ms SIP & PSTN Calls via Twilio and Telnyx",
      desc: "Automate inbound customer receptionists and outbound follow-up campaigns. Built on an event-driven cascade (STT → Agent Runtime → TTS) with active interruption/barge-in handling at 10,000 concurrent calls.",
      icon: PhoneCall,
      badge: "Sub-400ms Audio",
    },
    {
      id: "knowledge",
      endpoint: "services/knowledge-service :3009",
      title: "Enterprise Knowledge & Hybrid RAG",
      subtitle: "OpenSearch kNN, Async SQS Workers & Strict Tenancy",
      desc: "Ingest PDFs, technical documentation, and crawled web pages. Chunks, embeds, and indexes data into OpenSearch with workspace-level fail-closed isolation and citation grounding.",
      icon: Database,
      badge: "Vector Retrieval",
    },
    {
      id: "secrets",
      endpoint: "services/secrets-service :3011",
      title: "Tools, MCP & Encrypted Secrets Vault",
      subtitle: "AES-256-GCM Envelope Encryption & Zero-Downtime Rotation",
      desc: "Safely give agents the power to take real actions across external APIs and MCP tools. Sensitive API keys and tokens are encrypted at rest and never leaked in public API responses or logs.",
      icon: ShieldCheck,
      badge: "AES-256-GCM Vault",
    },
  ];

  return (
    <section id="platform" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-heat-12 text-heat-100 border border-heat-24 mb-3">
          Core Capabilities
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-accent-black mb-4">
          The Full-Stack Operating System for Autonomous AI Agents
        </h2>
        <p className="text-base text-neutral-600">
          Everything your enterprise needs to build, operate, and scale intelligent AI agents across any customer channel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.id}
              className="p-6 sm:p-8 rounded-20 bg-surface border border-border-faint hover:border-neutral-300 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-12 bg-neutral-100 flex items-center justify-center text-accent-black group-hover:bg-heat-12 group-hover:text-heat-100 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 border border-border-faint">
                    {f.endpoint}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-accent-black mb-1">
                  {f.title}
                </h3>
                <p className="text-sm font-semibold text-neutral-800 mb-2">
                  {f.subtitle}
                </p>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  {f.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-border-faint flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {f.badge}
                </span>
                <Link
                  href="#architecture"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-heat-100 transition-colors"
                >
                  <span>Architecture Spec</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

