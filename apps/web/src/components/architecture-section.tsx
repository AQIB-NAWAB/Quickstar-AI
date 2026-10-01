import { Shield, GitBranch, Cpu, Network } from "lucide-react";

export function ArchitectureSection() {
  const specs = [
    {
      title: "Fail-Closed Multi-Tenancy",
      description:
        "Every database query strictly filters by workspace_id across PostgreSQL, Valkey cache, and OpenSearch. Zero IDOR leakage with automated RBAC permission enforcement.",
      icon: Shield,
      stat: "10,000+ Tenants Isolated",
    },
    {
      title: "Immutable Agent Versioning",
      description:
        "Draft configurations are strictly decoupled from published production snapshots. Production chat and voice traffic always run against locked, audit-verified version pointers.",
      icon: GitBranch,
      stat: "Zero-Downtime Rollback",
    },
    {
      title: "Resilient Model Gateway",
      description:
        "Unified provider abstraction across OpenAI, Anthropic, Gemini, and Mistral with per-workspace token limits, circuit breakers, and automatic multi-provider fallback.",
      icon: Cpu,
      stat: "Multi-LLM Failover",
    },
    {
      title: "Distributed Event Streaming",
      description:
        "Kafka-backed event bus orchestrates asynchronous workflows, conversation events, and long-term memory extraction without bottlenecking the realtime API gateway.",
      icon: Network,
      stat: "10,000 req/s Sustained",
    },
  ];

  return (
    <section id="architecture" className="py-20 bg-neutral-100/50 border-t border-border-faint">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-neutral-200 text-neutral-800 mb-3">
            Distributed Systems Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-accent-black mb-4">
            Engineered for High-Concurrency Production Scale
          </h2>
          <p className="text-base text-neutral-600">
            Designed for 10,000 sustained HTTP requests/sec, 10,000 concurrent conversations, and 5,000 ongoing inbound and outbound voice calls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {specs.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="p-6 rounded-16 bg-white border border-border-faint hover:border-neutral-300 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-10 bg-neutral-100 flex items-center justify-center text-accent-black mb-4">
                    <Icon className="w-5 h-5 text-heat-100" />
                  </div>
                  <h3 className="text-base font-bold text-accent-black mb-2">
                    {s.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    {s.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border-faint">
                  <span className="font-mono text-xs font-semibold text-neutral-800">
                    {s.stat}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

