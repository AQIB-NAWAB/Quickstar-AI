"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AuthBrandLockup } from "./auth-brand-lockup";
import { WorkstationIllustration } from "../illustrations/workstation-illustration";
import { LockerIllustration } from "../illustrations/locker-illustration";
import "@/features/auth/styles/auth.css";

export interface AuthLayoutProps {
  variant: "login" | "register";
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthLayout({
  variant,
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
  const isRegister = variant === "register";

  const formEyebrow = "QuickStart workspace";
  const formTitle = title ?? (isRegister ? "Create your account" : "Welcome back");
  const formSubtitle =
    subtitle ??
    (isRegister
      ? "Set up your organization and first workspace."
      : "Sign in to your QuickStart workspace.");

  const sceneEyebrow = isRegister
    ? "YOUR BUSINESS, CONNECTED"
    : "YOUR QUICKSTART WORKSPACE";

  const sceneHeading = isRegister ? (
    <>
      Your next chapter
      <br />
      starts here.
    </>
  ) : (
    <>
      Your workspace.
      <br />
      Ready when you are.
    </>
  );

  const sceneParagraph = isRegister ? (
    <>
      A workspace for your agents, your knowledge
      <br />
      and the people behind your business.
    </>
  ) : (
    <>
      Pick up your conversations and continue
      <br />
      working with your agents and team.
    </>
  );

  const alternateRow = isRegister ? (
    <p className="auth-alternate">
      Already have an account?{" "}
      <Link href="/login">Sign in</Link>
    </p>
  ) : (
    <p className="auth-alternate">
      New to QuickStart?{" "}
      <Link href="/register">Create an account</Link>
    </p>
  );

  return (
    <div className="auth-page auth-scope">
      <main className="auth-shell">
        {/* Brand link inside upper-left of shell */}
        <Link
          href="/"
          aria-label="QuickStart AI home"
          className="auth-brand"
        >
          <AuthBrandLockup />
        </Link>

        {/* Left Panel: Form Side */}
        <section className="auth-form-side">
          <div className={`auth-form ${isRegister ? "auth-form-signup" : ""}`}>
            <div className="auth-form-eyebrow">{formEyebrow}</div>
            <h1 className="auth-form-title">{formTitle}</h1>
            <p className="auth-form-sub">{formSubtitle}</p>
            {children}
            {alternateRow}
          </div>
        </section>

        {/* Right Panel: Scene Side (Hidden on <=760px) */}
        <section className="auth-scene-side">
          <div className="auth-intro">
            <div className="auth-scene-eyebrow">
              <span className="auth-scene-eyebrow-dot" />
              <span>{sceneEyebrow}</span>
            </div>
            <h2 className="auth-scene-title">{sceneHeading}</h2>
            <p className="auth-scene-desc">{sceneParagraph}</p>
          </div>
          {isRegister ? (
            <WorkstationIllustration />
          ) : (
            <LockerIllustration />
          )}
        </section>
      </main>
    </div>
  );
}
