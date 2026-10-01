import Link from "next/link";
import { Check } from "lucide-react";

export function PricingSection() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      desc: "For testing agent prototypes, local development, and small experiments.",
      features: [
        "1,000 free agent turns / mo",
        "1 active published agent",
        "Web chat widget integration",
        "Up to 10 Knowledge document sources",
        "Community Discord support",
      ],
      cta: "Get started free",
      popular: false,
    },
    {
      name: "Starter",
      price: "$49",
      period: "/ month",
      desc: "For businesses deploying production chat and automated voice receptionists.",
      features: [
        "25,000 agent turns / mo",
        "5 active published agents",
        "Inbound & outbound voice telephony",
        "Hybrid OpenSearch RAG (1,000 docs)",
        "Secrets vault (20 credentials)",
        "Email & Discord support",
      ],
      cta: "Start 14-day trial",
      popular: true,
    },
    {
      name: "Scale",
      price: "$199",
      period: "/ month",
      desc: "High-volume pipelines for scaling autonomous multi-agent workloads.",
      features: [
        "150,000 agent turns / mo",
        "Unlimited published agents",
        "10 concurrent voice telephony lines",
        "Custom MCP tools & workflows",
        "Human-in-the-loop operational inbox",
        "Priority queue & direct Slack",
      ],
      cta: "Upgrade to Scale",
      popular: false,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      desc: "Dedicated cloud clusters, custom SLAs, and air-gapped private VPCs.",
      features: [
        "Unlimited agent turns & concurrency",
        "Private Kubernetes / AWS deployment",
        "99.99% uptime SLA guarantee",
        "Custom SSO, RBAC roles & audit logs",
        "Dedicated engineering architect",
      ],
      cta: "Contact Enterprise Sales",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-heat-12 text-heat-100 border border-heat-24 mb-3">
          Transparent Pricing
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-accent-black mb-4">
          Simple Per-Turn &amp; Telephony Pricing
        </h2>
        <p className="text-base text-neutral-600">
          Scale effortlessly from individual developers to multi-tenant global enterprises.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`p-6 sm:p-8 rounded-20 bg-surface border transition-all flex flex-col justify-between ${
              t.popular
                ? "border-heat-100 shadow-md relative"
                : "border-border-faint hover:border-neutral-300 shadow-sm"
            }`}
          >
            {t.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-heat-100 text-white text-xs font-semibold uppercase tracking-wider">
                Most Popular
              </div>
            )}

            <div>
              <h3 className="text-lg font-bold text-accent-black mb-1">
                {t.name}
              </h3>
              <p className="text-xs text-neutral-500 mb-4 min-h-[32px]">
                {t.desc}
              </p>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-bold text-accent-black">
                  {t.price}
                </span>
                <span className="text-xs text-neutral-500">{t.period}</span>
              </div>

              <ul className="space-y-2.5 text-xs text-neutral-600 mb-8">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-heat-100 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/register"
              className={`w-full py-2.5 rounded-10 text-xs font-semibold text-center transition-all ${
                t.popular
                  ? "bg-heat-100 text-white hover:bg-[#e04f12] shadow-firecrawl-btn"
                  : "bg-white text-accent-black border border-border-faint hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
