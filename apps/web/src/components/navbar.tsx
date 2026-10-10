"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { BrandLogo } from "./brand-logo";

interface NavLink {
  label: string;
  href: string;
  sectionId: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "Product", href: "#platform", sectionId: "platform" },
  { label: "How it works", href: "#how-it-works", sectionId: "how-it-works" },
  { label: "See it in action", href: "#playground", sectionId: "playground" },
  { label: "Pricing", href: "#pricing", sectionId: "pricing" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const headerRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
    menuToggleRef.current?.focus();
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

  // Close mobile menu when resizing to desktop breakpoint (>= 1100px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1100 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileMenuOpen]);

  // Use one viewport probe so selection does not depend on observer callback batches.
  useEffect(() => {
    const sections = NAV_LINKS.map((link) => ({
      id: link.sectionId,
      element: document.getElementById(link.sectionId),
    })).filter((section) => section.element !== null);
    let frame: number | null = null;
    const update = () => {
      frame = null;
      const headerHeight = headerRef.current?.offsetHeight ?? 72;
      const probe = headerHeight + Math.min(160, window.innerHeight * 0.2);
      const visible = sections
        .filter(({ element }) => {
          const bounds = element!.getBoundingClientRect();
          return bounds.top <= probe && bounds.bottom > headerHeight;
        })
        .sort(
          (a, b) => b.element!.getBoundingClientRect().top - a.element!.getBoundingClientRect().top,
        );
      setActiveSection(visible[0]?.id ?? null);
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const header = headerRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const siblings = Array.from(header?.parentElement?.children ?? []).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== header,
    );
    const previousInert = siblings.map((element) => element.inert);
    siblings.forEach((element) => {
      element.inert = true;
    });
    mobileNavRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(
        header?.querySelectorAll<HTMLElement>("a[href], button") ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !header?.contains(event.target)) closeMenu();
    };
    document.addEventListener("keydown", containFocus);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.body.style.overflow = overflow;
      siblings.forEach((element, index) => {
        element.inert = previousInert[index];
      });
      document.removeEventListener("keydown", containFocus);
      document.removeEventListener("pointerdown", outside);
    };
  }, [mobileMenuOpen, closeMenu]);

  const handleNavClick = (sectionId: string) => {
    setActiveSection(sectionId);
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 w-full bg-[#FAFAF8] border-b border-[#DEDED8]"
    >
      {/* Main Bar: Max width ~1304px matching site composition */}
      <div className="landing-container h-[68px] min-[1100px]:h-[72px] flex items-center justify-between">
        {/* Left Section: Brand + Divider + Navigation Links */}
        <div className="flex items-center min-w-0">
          {/* Brand Lockup */}
          <Link
            href="/"
            aria-label="QuickStartAI home"
            className="inline-flex items-center gap-2.5 min-[1100px]:min-w-[244px] xl:min-w-[272px] group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-sm select-none"
          >
            <BrandLogo
              size={28}
              animated
              fillColor="#fa5d19"
              className="w-6 h-6 min-[1100px]:w-7 min-[1100px]:h-7 shrink-0 transition-transform duration-150 motion-reduce:transition-none group-hover:scale-105"
              aria-hidden="true"
            />
            <span className="text-[20px] sm:text-[22px] min-[1100px]:text-[26px] font-bold tracking-tight text-[#262626] leading-none">
              QuickStart<span className="text-[#FF571A]"> AI</span>
            </span>
          </Link>

          {/* Desktop-only Vertical Divider (24px high, 1px grey) */}
          <div
            className="hidden min-[1100px]:block w-[1px] h-6 bg-[#DEDED8] mx-7 xl:mx-8 shrink-0"
            aria-hidden="true"
          />

          {/* Desktop Navigation Links (Immediately following divider, >=1100px) */}
          <nav
            aria-label="Main navigation"
            className="hidden min-[1100px]:flex items-center gap-5 xl:gap-7 whitespace-nowrap text-[15px] font-medium text-[#262626]"
          >
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.sectionId;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => handleNavClick(link.sectionId)}
                  aria-current={isActive ? "location" : undefined}
                  className="relative h-[44px] flex items-center text-[#262626] hover:text-[#FF571A] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-sm select-none group"
                >
                  <span className="relative py-1">
                    {link.label}
                    {/* Active orange underline beneath text width */}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FF571A] rounded-full"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Desktop Account Actions (>=1100px) */}
        <div className="hidden min-[1100px]:flex items-center">
          {/* Sign in */}
          <Link
            href="/coming-soon"
            className="text-[15px] font-medium text-[#262626] hover:text-[#FF571A] min-h-[44px] px-2 flex items-center mr-6 xl:mr-7 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-sm"
          >
            Sign in
          </Link>

          {/* Split Compartment Get started CTA */}
          <Link
            href="/coming-soon"
            className="group inline-flex items-center h-[44px] rounded-[8px] overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] select-none"
          >
            {/* Compartment 1: Orange text box */}
            <span className="h-full px-5 min-w-[124px] bg-[#FF571A] group-hover:bg-[#E04810] text-white text-[15px] font-semibold flex items-center justify-center transition-colors duration-150 motion-reduce:transition-none">
              Get started
            </span>

            {/* Compartment 2: Near-black arrow box (exactly 44px wide) */}
            <span className="w-[44px] h-full bg-[#262626] flex items-center justify-center shrink-0">
              <ArrowRight
                className="w-4 h-4 text-white stroke-[2.2] transition-transform duration-150 motion-reduce:transform-none group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        </div>

        {/* Mobile Control (<1100px): Outlined 2-line menu button */}
        <div className="flex min-[1100px]:hidden items-center">
          <button
            ref={menuToggleRef}
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-11 h-11 rounded-[8px] border border-[#DEDED8] bg-white flex items-center justify-center text-[#262626] hover:border-[#262626] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A]"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-dropdown"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-[#262626]" aria-hidden="true" />
            ) : (
              /* Two horizontal graphite lines matching approved reference */
              <svg
                width="18"
                height="12"
                viewBox="0 0 18 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="1" y1="2" x2="17" y2="2" />
                <line x1="1" y1="10" x2="17" y2="10" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Open State: Attached Dropdown out of normal flow */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-dropdown"
          ref={mobileNavRef}
          className="min-[1100px]:hidden absolute top-full left-0 right-0 bg-[#FAFAF8] border-b border-[#DEDED8] z-50 max-h-[calc(100dvh-68px)] overflow-y-auto"
        >
          <nav aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.sectionId;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => handleNavClick(link.sectionId)}
                  aria-current={isActive ? "location" : undefined}
                  className="w-full h-[54px] flex items-center px-5 sm:px-6 border-b border-[#DEDED8] text-[16px] font-medium text-[#262626] hover:text-[#FF571A] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A]"
                >
                  <span className="relative py-1">
                    {link.label}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FF571A] rounded-full"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </Link>
              );
            })}

            {/* Bottom Account Row: Sign in left, Split Get started CTA right */}
            <div className="px-5 sm:px-6 py-5 flex items-center justify-between gap-4">
              <Link
                href="/coming-soon"
                onClick={closeMenu}
                className="text-[16px] font-medium text-[#262626] hover:text-[#FF571A] min-h-[44px] flex items-center transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A]"
              >
                Sign in
              </Link>

              <Link
                href="/coming-soon"
                onClick={closeMenu}
                className="group inline-flex items-center h-[44px] rounded-[8px] overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A]"
              >
                <span className="h-full px-4 sm:px-5 bg-[#FF571A] group-hover:bg-[#E04810] text-white text-[14.5px] sm:text-[15px] font-semibold flex items-center justify-center transition-colors duration-150 motion-reduce:transition-none">
                  Get started
                </span>
                <span className="w-[44px] h-full bg-[#262626] flex items-center justify-center shrink-0">
                  <ArrowRight
                    className="w-4 h-4 text-white stroke-[2.2] transition-transform duration-150 motion-reduce:transform-none group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
