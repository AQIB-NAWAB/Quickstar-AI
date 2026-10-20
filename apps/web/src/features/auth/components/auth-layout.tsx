"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AuthBrandLockup } from "./auth-brand-lockup";
import { WorkstationIllustration } from "../illustrations/workstation-illustration";
import { LockerIllustration } from "../illustrations/locker-illustration";
import "@/features/auth/styles/auth.css";

export interface AuthLayoutProps {
  variant: "login" | "register" | "forgot-password" | "reset-password" | "invite";
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

  let formEyebrow = "QuickStart workspace";
  let formTitle = title ?? (isRegister ? "Create your account" : "Welcome back");
  let formSubtitle =
    subtitle ??
    (isRegister
      ? "Set up your organization and first workspace."
      : "Sign in to your QuickStart workspace.");

  let sceneEyebrow = isRegister
    ? "YOUR BUSINESS, CONNECTED"
    : "YOUR QUICKSTART WORKSPACE";

  let sceneHeading = isRegister ? (
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

  let sceneParagraph = isRegister ? (
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

  let alternateRow = isRegister ? (
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

  if (variant === "forgot-password") {
    formEyebrow = "Account recovery";
    formTitle = title ?? "Reset your password";
    formSubtitle = subtitle ?? "Enter your email address to receive a secure recovery link.";
    sceneEyebrow = "SECURE ACCESS";
    sceneHeading = (
      <>
        Recover your
        <br />
        account safely.
      </>
    );
    sceneParagraph = (
      <>
        We will send an encrypted, single-use link
        <br />
        to securely reset your password.
      </>
    );
    alternateRow = (
      <p className="auth-alternate">
        Remember your password?{" "}
        <Link href="/login">Sign in</Link>
      </p>
    );
  } else if (variant === "reset-password") {
    formEyebrow = "Account recovery";
    formTitle = title ?? "Choose a new password";
    formSubtitle = subtitle ?? "Enter a strong replacement password for your account.";
    sceneEyebrow = "SECURE ACCESS";
    sceneHeading = (
      <>
        Protect your
        <br />
        workspace.
      </>
    );
    sceneParagraph = (
      <>
        Resetting your password securely revokes
        <br />
        previous active sessions.
      </>
    );
    alternateRow = (
      <p className="auth-alternate">
        Back to{" "}
        <Link href="/login">Sign in</Link>
      </p>
    );
  } else if (variant === "invite") {
    formEyebrow = "Workspace invitation";
    formTitle = title ?? "Join your team";
    formSubtitle = subtitle ?? "You have been invited to collaborate on QuickStart AI.";
    sceneEyebrow = "TEAM COLLABORATION";
    sceneHeading = (
      <>
        Welcome to
        <br />
        the team.
      </>
    );
    sceneParagraph = (
      <>
        Build, operate, and deploy AI agents
        <br />
        together with your organization.
      </>
    );
    alternateRow = (
      <p className="auth-alternate">
        Need to sign in as a different user?{" "}
        <Link href="/login">Sign in</Link>
      </p>
    );
  }

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
