"use client";

import { Key, Copy, Check, FileCode2, Zap, Clock, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function DashboardPage() {
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const sampleKey = "fc-live-9a84b3c2e1f0458762";

  const handleCopyKey = () => {
    navigator.clipboard.writeText(sampleKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  const metrics = [
    { label: "Available Credits", value: "500", sub: "Free plan", icon: Zap },
    { label: "Total Scrapes", value: "1,248", sub: "+18% this week", icon: FileCode2 },
    { label: "Avg Latency", value: "118ms", sub: "P99 sub-second", icon: Clock },
    { label: "Bypass Success", value: "99.8%", sub: "Zero Cloudflare blocks", icon: ShieldCheck },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-accent-black">
          Dashboard Overview
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Monitor your web data pipelines, credits, and active scrape jobs.
        </p>
      </div>

      {/* API Key Box */}
      <div className="p-6 rounded-20 bg-white border border-border-faint shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Key className="w-4 h-4 text-heat-100" />
            <span className="text-xs font-bold text-accent-black uppercase tracking-wider">
              Production API Key
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Use this key in the Authorization header: <code className="font-mono text-neutral-700">Bearer fc-YOUR_KEY</code>
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <code className="px-3 py-1.5 rounded-8 bg-neutral-100 border border-border-faint text-xs font-mono text-neutral-800 select-all">
            fc-live-•••••••••••••458762
          </code>
          <button
            onClick={handleCopyKey}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 text-xs font-semibold bg-white border border-border-faint hover:bg-neutral-50 text-accent-black transition-colors"
          >
            {apiKeyCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="p-5 rounded-16 bg-white border border-border-faint shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-medium text-neutral-500">{m.label}</p>
                <p className="text-2xl font-bold text-accent-black mt-1">{m.value}</p>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">{m.sub}</p>
              </div>
              <div className="w-10 h-10 rounded-10 bg-neutral-50 border border-border-faint flex items-center justify-center text-heat-100">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Table */}
      <div className="rounded-20 bg-white border border-border-faint shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border-faint flex items-center justify-between">
          <h3 className="text-sm font-bold text-accent-black">Recent Scrape Requests</h3>
          <span className="text-xs text-neutral-400 font-mono">Auto-refreshing</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 text-neutral-500 font-medium border-b border-border-faint">
              <tr>
                <th className="py-3 px-4">Method / Endpoint</th>
                <th className="py-3 px-4">Target URL</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-faint text-neutral-700">
              <tr>
                <td className="py-3 px-4 font-mono font-semibold text-accent-black">POST /v1/scrape</td>
                <td className="py-3 px-4 font-mono text-neutral-600">https://mendable.ai</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    200 OK
                  </span>
                </td>
                <td className="py-3 px-4 font-mono">124ms</td>
                <td className="py-3 px-4 text-neutral-400">2 mins ago</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-semibold text-accent-black">POST /v1/map</td>
                <td className="py-3 px-4 font-mono text-neutral-600">https://docs.anthropic.com</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    200 OK
                  </span>
                </td>
                <td className="py-3 px-4 font-mono">312ms</td>
                <td className="py-3 px-4 text-neutral-400">14 mins ago</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-semibold text-accent-black">POST /v1/crawl</td>
                <td className="py-3 px-4 font-mono text-neutral-600">https://news.ycombinator.com</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    200 OK
                  </span>
                </td>
                <td className="py-3 px-4 font-mono">842ms</td>
                <td className="py-3 px-4 text-neutral-400">1 hour ago</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
