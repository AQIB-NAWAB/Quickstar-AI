"use client";

import { useState } from "react";
import { Copy, Check, Terminal, FileText, CheckCircle2 } from "lucide-react";
import { ModeType } from "./interactive-url-bar";

interface CodePlaygroundProps {
  currentMode?: ModeType;
  currentUrl?: string;
}

export function CodePlayground({
  currentMode = "scrape",
  currentUrl = "https://mendable.ai",
}: CodePlaygroundProps) {
  const [activeLang, setActiveLang] = useState<"python" | "curl" | "node">("python");
  const [copied, setCopied] = useState(false);

  // Generate code based on language & mode
  const getCodeSnippet = () => {
    const targetUrl = currentUrl || "https://example.com";

    if (activeLang === "python") {
      switch (currentMode) {
        case "scrape":
          return `from firecrawl import FirecrawlApp\n\napp = FirecrawlApp(api_key="fc-YOUR_API_KEY")\n\n# Scrape dynamic web page to clean LLM-ready markdown\nscrape_result = app.scrape_url(\n    "${targetUrl}",\n    params={"formats": ["markdown", "html"]}\n)\nprint(scrape_result["markdown"])`;
        case "crawl":
          return `from firecrawl import FirecrawlApp\n\napp = FirecrawlApp(api_key="fc-YOUR_API_KEY")\n\n# Recursively crawl entire site with subpages\ncrawl_job = app.crawl_url(\n    "${targetUrl}",\n    params={"limit": 50, "scrapeOptions": {"formats": ["markdown"]}}\n)\nprint(crawl_job["data"])`;
        case "map":
          return `from firecrawl import FirecrawlApp\n\napp = FirecrawlApp(api_key="fc-YOUR_API_KEY")\n\n# Map all discovered URLs on domain in seconds\nmap_result = app.map_url("${targetUrl}")\nprint(map_result["links"])`;
        case "search":
          return `from firecrawl import FirecrawlApp\n\napp = FirecrawlApp(api_key="fc-YOUR_API_KEY")\n\n# Search the web and return scraped markdown instantly\nsearch_result = app.search(\n    query="AI agent autonomous workflows",\n    params={"limit": 5}\n)\nprint(search_result["data"])`;
      }
    }

    if (activeLang === "node") {
      switch (currentMode) {
        case "scrape":
          return `import FirecrawlApp from '@mendable/firecrawl-js';\n\nconst app = new FirecrawlApp({ apiKey: 'fc-YOUR_API_KEY' });\n\nconst result = await app.scrapeUrl('${targetUrl}', {\n  formats: ['markdown'],\n});\nconsole.log(result.markdown);`;
        case "crawl":
          return `import FirecrawlApp from '@mendable/firecrawl-js';\n\nconst app = new FirecrawlApp({ apiKey: 'fc-YOUR_API_KEY' });\n\nconst job = await app.crawlUrl('${targetUrl}', {\n  limit: 50,\n  scrapeOptions: { formats: ['markdown'] },\n});\nconsole.log(job.data);`;
        case "map":
          return `import FirecrawlApp from '@mendable/firecrawl-js';\n\nconst app = new FirecrawlApp({ apiKey: 'fc-YOUR_API_KEY' });\n\nconst map = await app.mapUrl('${targetUrl}');\nconsole.log(map.links);`;
        case "search":
          return `import FirecrawlApp from '@mendable/firecrawl-js';\n\nconst app = new FirecrawlApp({ apiKey: 'fc-YOUR_API_KEY' });\n\nconst res = await app.search('AI agent autonomous workflows');\nconsole.log(res.data);`;
      }
    }

    // cURL
    switch (currentMode) {
      case "scrape":
        return `curl -X POST https://api.firecrawl.dev/v1/scrape \\\n  -H "Authorization: Bearer fc-YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "url": "${targetUrl}",\n    "formats": ["markdown"]\n  }'`;
      case "crawl":
        return `curl -X POST https://api.firecrawl.dev/v1/crawl \\\n  -H "Authorization: Bearer fc-YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "url": "${targetUrl}",\n    "limit": 50\n  }'`;
      case "map":
        return `curl -X POST https://api.firecrawl.dev/v1/map \\\n  -H "Authorization: Bearer fc-YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "url": "${targetUrl}"\n  }'`;
      case "search":
        return `curl -X POST https://api.firecrawl.dev/v1/search \\\n  -H "Authorization: Bearer fc-YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "query": "AI agent autonomous workflows"\n  }'`;
    }
  };

  const code = getCodeSnippet();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 px-4 sm:px-0">
      <div className="bg-surface rounded-16 border border-border-faint shadow-firecrawl-card overflow-hidden">
        {/* Top Header / Language Switcher */}
        <div className="px-4 py-3 bg-neutral-50/80 border-b border-border-faint flex items-center justify-between">
          <div className="flex items-center gap-1">
            {(["python", "node", "curl"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveLang(lang)}
                className={`px-3 py-1 rounded-6 text-xs font-semibold capitalize transition-all ${
                  activeLang === lang
                    ? "bg-white text-accent-black shadow-sm border border-border-faint"
                    : "text-neutral-500 hover:text-accent-black"
                }`}
              >
                {lang === "node" ? "Node.js" : lang === "curl" ? "cURL" : "Python"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              v1.0 API Ready
            </span>

            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-accent-black p-1 rounded"
              title="Copy snippet"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2-Column Split: Code vs Markdown Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border-faint">
          {/* Left: Code Snippet */}
          <div className="p-4 sm:p-5 bg-white font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto text-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-3 font-sans font-medium uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-heat-100" />
                Request Code
              </span>
              <span>{activeLang}</span>
            </div>
            <pre className="whitespace-pre overflow-x-auto text-neutral-800">
              <code>{code}</code>
            </pre>
          </div>

          {/* Right: Markdown Output */}
          <div className="p-4 sm:p-5 bg-neutral-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-3 font-sans font-medium uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-neutral-700 font-semibold">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  [ .MD ] Clean Output
                </span>
                <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  98.4% token reduction
                </span>
              </div>

              {/* Rendered Markdown Preview Block */}
              <div className="font-mono text-xs text-neutral-800 bg-white p-3 rounded-8 border border-border-faint space-y-2 leading-relaxed max-h-[220px] overflow-y-auto">
                <p className="font-bold text-accent-black">
                  # Mendable — AI Knowledge Platform
                </p>
                <p className="text-neutral-600">
                  &gt; Ingest, index, and query dynamic web documentation with sub-100ms latency.
                </p>
                <p className="font-semibold text-accent-black">## Key Features</p>
                <ul className="list-disc pl-4 space-y-1 text-neutral-700">
                  <li>Automated crawler bypasses Cloudflare &amp; Datadome</li>
                  <li>Extracts clean semantically tagged Markdown without ads</li>
                  <li>Real-time LLM streaming API integration</li>
                </ul>
              </div>
            </div>

            {/* Response telemetry footer */}
            <div className="mt-4 pt-3 border-t border-border-faint flex items-center justify-between text-xs text-neutral-500 font-mono">
              <span className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                200 OK
              </span>
              <span>Execution: 124ms</span>
              <span>Tokens: 342</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
