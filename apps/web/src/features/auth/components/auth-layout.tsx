"use client";

import Link from "next/link";
import Image from "next/image";
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
  const isRecovery = variant === "forgot-password" || variant === "reset-password";
  const refreshed = isRegister || variant === "login" || isRecovery;
  const artwork = isRegister ? "signup-desk" : isRecovery ? "password-recovery" : "login-security";

  let formEyebrow = isRegister ? "GET STARTED" : "YOUR WORKSPACE";
  let formTitle = title ?? (isRegister ? "Create your account" : "Welcome back");
  let formSubtitle =
    subtitle ??
    (isRegister
      ? "Your first agent starts here."
      : "Sign in to your QuickStart workspace.");

  let sceneEyebrow = isRegister
    ? "YOUR BUSINESS, CONNECTED"
    : "YOUR QUICKSTART WORKSPACE";

  let sceneHeading = isRegister ? (
    <>
      Built around
      <br />
      <span className="auth-scene-accent">your business.</span>
    </>
  ) : (
    <>
      Your workspace.
      <br />
      <span className="auth-scene-accent">Ready when you are.</span>
    </>
  );

  let sceneParagraph = isRegister ? (
    <>
      One workspace for your agents, knowledge, and team.
    </>
  ) : (
    <>
      Pick up your conversations and keep your agents moving.
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
    formSubtitle = subtitle ?? "Enter your email address to receive a recovery link.";
    sceneEyebrow = "SECURE ACCESS";
    sceneHeading = (
      <>
        Recover your account.
        <br />
        <span className="auth-scene-accent">Get back to work.</span>
      </>
    );
    sceneParagraph = (
      <>
        We’ll send a recovery link to your inbox.
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
        <span className="auth-scene-accent">workspace.</span>
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
    <div className={`auth-page auth-scope ${refreshed ? "auth-refreshed" : ""} ${isRegister ? "auth-register" : ""}`}>
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
            {!refreshed && <div className="auth-scene-eyebrow">
              <span className="auth-scene-eyebrow-dot" />
              <span>{sceneEyebrow}</span>
            </div>}
            <h2 className="auth-scene-title">{sceneHeading}</h2>
            <p className="auth-scene-desc">{sceneParagraph}</p>
          </div>
          {refreshed ? (
            <div className={`auth-generated-art ${isRegister ? "auth-generated-art--desk" : ""}`}>
              <Image src={`/auth/${artwork}.webp`} alt={isRegister ? "White workspace desk with a chat monitor, keyboard, mouse on the right, and orange coffee mug" : isRecovery ? "Recovery email with a branded card, padlock, and orange return arrow" : "White padlock protecting business documents, with the QuickStart logo on a shield"} width={1536} height={1024} priority unoptimized />
            </div>
          ) : isRegister ? (
            <WorkstationIllustration />
          ) : (
            <LockerIllustration />
          )}
        </section>
      </main>
    </div>
  );
}
