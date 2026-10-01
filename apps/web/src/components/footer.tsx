import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border-faint bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand info */}
          <div className="col-span-2">
            <Link href="/" className="inline-block text-xl font-bold tracking-tight text-accent-black mb-3">
              firecrawl
            </Link>
            <p className="text-xs text-neutral-500 max-w-sm leading-relaxed mb-4">
              Turn entire websites into LLM-ready markdown or structured data. Fast, resilient, and open source.
            </p>
            {/* Live operational badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All systems operational</span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent-black mb-4">
              Product
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600">
              <li>
                <Link href="#features" className="hover:text-accent-black">
                  Scrape API
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-accent-black">
                  Crawl API
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-accent-black">
                  Map API
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-accent-black">
                  Extract API
                </Link>
              </li>
              <li>
                <Link href="/playground" className="hover:text-accent-black">
                  Playground
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-accent-black">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Developers */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent-black mb-4">
              Developers
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600">
              <li>
                <Link href="/docs" className="hover:text-accent-black">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/docs/api" className="hover:text-accent-black">
                  API Reference
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/firecrawl/firecrawl"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent-black"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/firecrawl"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent-black"
                >
                  Discord Community
                </a>
              </li>
              <li>
                <Link href="/changelog" className="hover:text-accent-black">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Company */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent-black mb-4">
              Company
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600">
              <li>
                <Link href="/about" className="hover:text-accent-black">
                  About
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-accent-black">
                  Blog
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
              <li>
                <Link href="/security" className="hover:text-accent-black">
                  Security
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border-faint flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-4">
          <p>© 2026 Firecrawl / QuickStart AI. All rights reserved.</p>
          <p className="font-mono">Clean web data for AI agents &amp; LLMs.</p>
        </div>
      </div>
    </footer>
  );
}
