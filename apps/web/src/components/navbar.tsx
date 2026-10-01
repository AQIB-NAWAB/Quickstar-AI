"use client";

import Link from "next/link";
import { Star, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-faint bg-background-base/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand (Typographic only, no logo image per user requirement) */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-bold tracking-tight text-accent-black group-hover:text-heat-100 transition-colors">
            firecrawl
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-heat-12 text-heat-100 border border-heat-24">
            v2.0
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/playground"
            className="text-sm font-medium text-neutral-600 hover:text-accent-black transition-colors"
          >
            Playground
          </Link>
          <Link
            href="#features"
            className="text-sm font-medium text-neutral-600 hover:text-accent-black transition-colors"
          >
            Features
          </Link>
          <Link
            href="#architecture"
            className="text-sm font-medium text-neutral-600 hover:text-accent-black transition-colors"
          >
            Architecture
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-neutral-600 hover:text-accent-black transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="text-sm font-medium text-neutral-600 hover:text-accent-black transition-colors"
          >
            Docs
          </Link>
        </nav>

        {/* Right side CTAs */}
        <div className="hidden md:flex items-center gap-4">
          {/* GitHub Star Pill */}
          <a
            href="https://github.com/firecrawl/firecrawl"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 text-xs font-medium text-neutral-700 bg-white border border-border-faint hover:border-border-muted transition-all shadow-sm"
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>★ 14.8k</span>
          </a>

          <Link
            href="/login"
            className="text-sm font-medium text-neutral-700 hover:text-accent-black px-2 py-1 transition-colors"
          >
            Sign in
          </Link>

          <Link
            href="/register"
            className="inline-flex items-center justify-center px-4 py-2 rounded-10 text-sm font-semibold text-white bg-heat-100 hover:bg-[#e04f12] active:scale-[0.98] transition-all shadow-firecrawl-btn"
          >
            Start for free
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <div className="md:hidden flex items-center gap-2">
          <Link
            href="/register"
            className="px-3 py-1.5 rounded-8 text-xs font-semibold text-white bg-heat-100"
          >
            Start free
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-8 text-neutral-700 hover:bg-neutral-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border-faint bg-white px-4 py-4 space-y-3">
          <Link
            href="/playground"
            className="block text-sm font-medium text-neutral-800 py-1"
            onClick={() => setMobileMenuOpen(false)}
          >
            Playground
          </Link>
          <Link
            href="#features"
            className="block text-sm font-medium text-neutral-800 py-1"
            onClick={() => setMobileMenuOpen(false)}
          >
            Features
          </Link>
          <Link
            href="#architecture"
            className="block text-sm font-medium text-neutral-800 py-1"
            onClick={() => setMobileMenuOpen(false)}
          >
            Architecture
          </Link>
          <Link
            href="#pricing"
            className="block text-sm font-medium text-neutral-800 py-1"
            onClick={() => setMobileMenuOpen(false)}
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="block text-sm font-medium text-neutral-800 py-1"
            onClick={() => setMobileMenuOpen(false)}
          >
            Docs
          </Link>
          <div className="pt-2 border-t border-border-faint flex items-center justify-between">
            <Link
              href="/login"
              className="text-sm font-semibold text-neutral-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign in
            </Link>
            <a
              href="https://github.com/firecrawl/firecrawl"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-neutral-600"
            >
              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
              <span>14.8k stars</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
