import { Shield, Zap, Layers, Server } from "lucide-react";

export function ArchitectureSection() {
  const specs = [
    {
      title: "Smart Bot Detection Bypass",
      description:
        "Bypasses Cloudflare, Datadome, PerimeterX, and Akamai using automated TLS fingerprinting, residential proxy rotation, and smart backoffs.",
      icon: Shield,
      stat: "99.9% Success Rate",
    },
    {
      title: "Dynamic JavaScript Rendering",
      description:
        "Full headless browser runtime executes complex Single Page Apps (React, Vue, Next.js), handles infinite scrolls, and waits for dynamic network requests.",
      icon: Zap,
      stat: "Sub-Second Execution",
    },
    {
      title: "LLM-Ready Clean Markdown",
      description:
        "Intelligent heuristic stripper removes cookie banners, navigation bars, advertisements, and tracking scripts, preserving clean headings, tables, and lists.",
      icon: Layers,
      stat: "98% Token Reduction",
    },
    {
      title: "Open Source & Self-Hostable",
      description:
        "Run in our hosted cloud or deploy inside your private AWS/GCP VPC using our open-source Docker Compose and Kubernetes Helm charts.",
      icon: Server,
      stat: "AGPLv3 & Enterprise",
    },
  ];

  return (
    <section id="architecture" className="py-20 bg-neutral-100/50 border-t border-border-faint">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-neutral-200 text-neutral-800 mb-3">
            Engine Specs
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-accent-black mb-4">
            The Scrape &amp; Ingestion Architecture
          </h2>
          <p className="text-base text-neutral-600">
            Engineered to deliver clean web data at enterprise scale with zero maintenance.
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
