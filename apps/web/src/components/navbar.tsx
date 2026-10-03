"use client";

import Link from "next/link";
import { Menu, X, ArrowRight, ArrowUpRight } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#FAFAF8]/95 backdrop-blur-md">
      {/* Thin bottom border aligned with container */}
      <div className="border-b border-[#E8E8E5]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF571A] inline-block shrink-0" />
            <span className="text-[25px] font-bold tracking-tight text-[#262626] group-hover:opacity-95 transition-opacity">
              QuickStart<span className="text-[#FF571A]">AI</span>
            </span>
          </Link>

          {/* Centered Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <Link
              href="#platform"
              className="hover:text-[#262626] transition-colors py-1"
            >
              Platform
            </Link>
            <Link
              href="#playground"
              className="hover:text-[#262626] transition-colors py-1"
            >
              Playground
            </Link>
            <Link
              href="#architecture"
              className="hover:text-[#262626] transition-colors py-1"
            >
              Architecture
            </Link>
            <Link
              href="#pricing"
              className="hover:text-[#262626] transition-colors py-1"
            >
              Pricing
            </Link>
          </nav>

          {/* Right side controls */}
          <div className="hidden md:flex items-center gap-4">
            {/* GitHub link with icon and external arrow */}
            <a
              href="https://github.com/AQIB-NAWAB/Quickstar-AI"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub repository"
              className="inline-flex items-center gap-0.5 text-[#262626] hover:text-[#FF571A] p-1.5 transition-colors"
            >
              <svg
                className="w-5 h-5 fill-current"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-600" />
            </a>

            {/* Sign in */}
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg border border-neutral-300/80 bg-white hover:bg-neutral-50 text-sm font-medium text-[#262626] transition-colors shadow-2xs"
            >
              Sign in
            </Link>

            {/* Start building button */}
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF571A] hover:bg-[#E04810] text-sm font-semibold text-white shadow-sm transition-colors active:scale-[0.98]"
            >
              <span>Start building</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile menu toggle button */}
          <div className="md:hidden flex items-center gap-2">
            <Link
              href="/register"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FF571A] text-white"
            >
              Start building
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#262626] hover:bg-neutral-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E8E8E5] bg-[#FAFAF8] px-5 py-4 space-y-3">
          <Link
            href="#platform"
            className="block text-sm font-medium text-[#262626] py-1.5"
            onClick={() => setMobileMenuOpen(false)}
          >
            Platform
          </Link>
          <Link
            href="#playground"
            className="block text-sm font-medium text-[#262626] py-1.5"
            onClick={() => setMobileMenuOpen(false)}
          >
            Playground
          </Link>
          <Link
            href="#architecture"
            className="block text-sm font-medium text-[#262626] py-1.5"
            onClick={() => setMobileMenuOpen(false)}
          >
            Architecture
          </Link>
          <Link
            href="#pricing"
            className="block text-sm font-medium text-[#262626] py-1.5"
            onClick={() => setMobileMenuOpen(false)}
          >
            Pricing
          </Link>

          <div className="pt-3 border-t border-[#E8E8E5] flex items-center justify-between">
            <Link
              href="/login"
              className="text-sm font-semibold text-[#262626] hover:text-[#FF571A]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign in
            </Link>
            <a
              href="https://github.com/AQIB-NAWAB/Quickstar-AI"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-[#262626]"
            >
              <span>GitHub</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
