import { FileCode2, Network, MapPin, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export function FeatureGrid() {
  const features = [
    {
      id: "scrape",
      endpoint: "/v1/scrape",
      title: "Scrape",
      subtitle: "Turn any URL into LLM-ready markdown or structured data",
      desc: "Handles dynamic JavaScript rendering, shadow DOMs, infinite scrolls, and automatically bypasses anti-bot blockades.",
      icon: FileCode2,
      badge: "High-Speed",
    },
    {
      id: "crawl",
      endpoint: "/v1/crawl",
      title: "Crawl",
      subtitle: "Recursively crawl entire websites with subpages",
      desc: "Traverse every accessible route with automatic pagination, sitemap resolution, and configurable depth limits.",
      icon: Network,
      badge: "Async Jobs",
    },
    {
      id: "map",
      endpoint: "/v1/map",
      title: "Map",
      subtitle: "Discover all URLs on a domain in seconds",
      desc: "Fastest way to get a clean index of any domain without full scraping. Built for high-throughput discovery.",
      icon: MapPin,
      badge: "< 500ms",
    },
    {
      id: "extract",
      endpoint: "/v1/extract",
      title: "Extract",
      subtitle: "Structured JSON extraction using AI schemas",
      desc: "Define your Zod or JSON schema and let AI extract typed properties, pricing tables, and product details cleanly.",
      icon: Sparkles,
      badge: "AI Powered",
    },
  ];

  return (
    <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-heat-12 text-heat-100 border border-heat-24 mb-3">
          Core Capabilities
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-accent-black mb-4">
          Built from the ground up for LLMs and AI Agents
        </h2>
        <p className="text-base text-neutral-600">
          Four dedicated endpoints to transform raw, noisy websites into clean, reliable context.
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
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {f.badge}
                </span>
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-heat-100 transition-colors"
                >
                  <span>Explore API</span>
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
