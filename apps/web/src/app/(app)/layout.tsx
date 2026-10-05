"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileCode2,
  Network,
  MapPin,
  Key,
  Settings,
  CreditCard,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [workspace, setWorkspace] = useState("Default Workspace");

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Scrape API", href: "/dashboard/scrape", icon: FileCode2 },
    { name: "Crawl Jobs", href: "/dashboard/crawl", icon: Network },
    { name: "Map URLs", href: "/dashboard/map", icon: MapPin },
    { name: "API Keys", href: "/dashboard/api-keys", icon: Key },
    { name: "Billing & Credits", href: "/dashboard/billing", icon: CreditCard },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background-base flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-faint bg-white flex flex-col justify-between hidden md:flex">
        <div>
          {/* Brand header */}
          <div className="h-16 px-6 border-b border-border-faint flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-accent-black hover:opacity-90 transition-opacity">
              <BrandLogo className="w-6 h-6 shrink-0" />
              <span>QuickStart<span className="text-[#FF571A]">AI</span></span>
            </Link>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-heat-12 text-heat-100 border border-heat-24">
              PROD
            </span>
          </div>

          {/* Workspace Switcher */}
          <div className="p-4 border-b border-border-faint">
            <button className="w-full flex items-center justify-between p-2.5 rounded-8 border border-border-faint hover:bg-neutral-50 text-left text-xs transition-colors">
              <div>
                <p className="font-semibold text-accent-black">{workspace}</p>
                <p className="text-neutral-500 font-mono text-[10px]">ws_default_01</p>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-8 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-heat-12 text-heat-100 font-semibold"
                      : "text-neutral-600 hover:text-accent-black hover:bg-neutral-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-heat-100" : "text-neutral-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-border-faint flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-xs text-neutral-700">
              JD
            </div>
            <div>
              <p className="text-xs font-semibold text-accent-black">Jane Doe</p>
              <p className="text-[10px] text-neutral-500">jane@acme.com</p>
            </div>
          </div>
          <Link href="/login" className="text-neutral-400 hover:text-red-600 p-1" title="Sign out">
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border-faint bg-white/80 backdrop-blur-md px-6 flex items-center justify-between md:justify-end gap-4">
          <Link href="/" className="md:hidden flex items-center gap-1.5 text-lg font-bold text-accent-black">
            <BrandLogo className="w-5 h-5 shrink-0" />
            <span>QuickStart<span className="text-[#FF571A]">AI</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 font-mono">
              Credits remaining: <strong className="text-heat-100 font-bold">500</strong>
            </span>
            <Link
              href="#pricing"
              className="px-3 py-1.5 rounded-8 text-xs font-semibold bg-heat-100 text-white hover:bg-[#e04f12] transition-colors"
            >
              Add credits
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
