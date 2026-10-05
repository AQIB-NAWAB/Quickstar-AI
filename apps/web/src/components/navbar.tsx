"use client";

import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { BrandLogo } from "./brand-logo";

const NAV_LINKS = [
  { label: "Product", href: "#platform" },
  { label: "How it works", href: "#how-it-works" },
  { label: "See it in action", href: "#playground" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  // Close mobile menu on Escape key press
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, closeMenu]);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#FAFAF8] border-b border-[#E8E8E5]">
      {/* Main Header Bar */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] lg:h-20 flex items-center justify-between">
        {/* Left: Brand Lockup */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 lg:gap-[10px] group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-sm select-none"
        >
          {/* Logo: ~24px mobile, ~28px desktop */}
          <BrandLogo
            size={28}
            className="w-6 h-6 lg:w-7 lg:h-7 shrink-0 transition-transform duration-150 motion-reduce:transition-none group-hover:scale-105"
          />
          {/* Wordmark: ~18-20px mobile, ~28px desktop */}
          <span className="text-[18px] sm:text-[20px] lg:text-[28px] font-bold tracking-tight text-[#262626] group-hover:opacity-95 transition-opacity duration-150 motion-reduce:transition-none leading-none">
            QuickStart<span className="text-[#FF571A]">AI</span>
          </span>
        </Link>

        {/* Center: Desktop Navigation Links (Visible >= 1024px) */}
        <nav
          aria-label="Main navigation"
          className="hidden lg:flex items-center gap-8 xl:gap-9 text-[15px] font-medium text-[#262626]"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="py-1 hover:text-[#FF571A] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-sm"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: Desktop Account Actions (Visible >= 1024px) */}
        <div className="hidden lg:flex items-center gap-6">
          <Link
            href="/coming-soon"
            className="text-[15px] font-medium text-[#262626] hover:text-[#FF571A] py-2 px-1 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-sm"
          >
            Sign in
          </Link>

          <Link
            href="/coming-soon"
            className="inline-flex items-center justify-center gap-2 h-[44px] min-w-[144px] px-5 rounded-[8px] bg-[#FF571A] hover:bg-[#E04810] text-[15px] font-semibold text-white transition-all duration-150 motion-reduce:transition-none active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A]"
          >
            <span>Get started</span>
            <ArrowRight className="w-4 h-4 shrink-0 stroke-[2]" />
          </Link>
        </div>

        {/* Right: Mobile Controls (Visible < 1024px) */}
        <div className="flex lg:hidden items-center gap-2.5">
          {/* Compact Mobile "Get started" Button (no arrow) */}
          <Link
            href="/coming-soon"
            className="inline-flex items-center justify-center h-[38px] w-[94px] sm:w-[100px] rounded-[8px] bg-[#FF571A] hover:bg-[#E04810] text-[13px] sm:text-[14px] font-semibold text-white transition-all duration-150 motion-reduce:transition-none active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A]"
          >
            Get started
          </Link>

          {/* Accessible Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center text-[#262626] hover:text-[#FF571A] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-sm bg-transparent border-0"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-panel"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-[#262626]" />
            ) : (
              <Menu className="w-5 h-5 text-[#262626]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Open State Panel (Visible < 1024px when open) */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-panel"
          className="lg:hidden border-t border-[#E8E8E5] bg-[#FAFAF8] px-5 sm:px-6 shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
        >
          <nav aria-label="Mobile navigation" className="py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={closeMenu}
                className="w-full h-[52px] flex items-center text-[16px] font-medium text-[#262626] hover:text-[#FF571A] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-sm"
              >
                {link.label}
              </Link>
            ))}

            {/* Subtle Divider after Pricing */}
            <div className="w-full h-px bg-[#E8E8E5] my-1" />

            {/* Sign in row */}
            <Link
              href="/coming-soon"
              onClick={closeMenu}
              className="w-full h-[52px] flex items-center text-[16px] font-medium text-[#262626] hover:text-[#FF571A] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-sm"
            >
              Sign in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
