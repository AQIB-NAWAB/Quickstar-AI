import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border-faint bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand info */}
          <div className="col-span-2">
            <Link href="/" className="inline-block text-xl font-bold tracking-tight text-accent-black mb-3">
              QuickStart<span className="text-heat-100">AI</span>
            </Link>
            <p className="text-xs text-neutral-500 max-w-sm leading-relaxed mb-4">
              Production-grade, multi-tenant AI agent platform. Build and scale autonomous conversational agents across website chat, telephony voice calls, and automated workflows.
            </p>
            {/* Live operational badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Platform Core Online (10k req/s)</span>
            </div>
          </div>

          {/* Column 1: Platform */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent-black mb-4">
              Platform
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600">
              <li>
                <Link href="#platform" className="hover:text-accent-black">
                  Agent Engine
                </Link>
              </li>
              <li>
                <Link href="#platform" className="hover:text-accent-black">
                  Omnichannel Chat
                </Link>
              </li>
              <li>
                <Link href="#platform" className="hover:text-accent-black">
                  Voice Telephony
                </Link>
              </li>
              <li>
                <Link href="#platform" className="hover:text-accent-black">
                  Knowledge RAG
                </Link>
              </li>
              <li>
                <Link href="#platform" className="hover:text-accent-black">
                  Secrets Vault
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-accent-black">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Engineering & Architecture */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent-black mb-4">
              Architecture
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600">
              <li>
                <Link href="#architecture" className="hover:text-accent-black">
                  System Architecture
                </Link>
              </li>
              <li>
                <Link href="#architecture" className="hover:text-accent-black">
                  Multi-Tenancy Guide
                </Link>
              </li>
              <li>
                <Link href="#architecture" className="hover:text-accent-black">
                  Immutable Versioning
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/AQIB-NAWAB/Quickstar-AI"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent-black"
                >
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Trust & Security */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent-black mb-4">
              Security
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600">
              <li>
                <Link href="#architecture" className="hover:text-accent-black">
                  Tenant Isolation
                </Link>
              </li>
              <li>
                <Link href="#architecture" className="hover:text-accent-black">
                  AES-256-GCM Vault
                </Link>
              </li>
              <li>
                <Link href="#architecture" className="hover:text-accent-black">
                  RBAC Specifications
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-accent-black">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-accent-black">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border-faint flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-4">
          <p>© 2026 QuickStart AI. Production-Scale Autonomous AI Agent Platform.</p>
          <p className="font-mono">Engineered for 10,000 req/sec sustained scale.</p>
        </div>
      </div>
    </footer>
  );
}
