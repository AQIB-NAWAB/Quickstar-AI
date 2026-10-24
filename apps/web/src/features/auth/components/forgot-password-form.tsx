"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AuthLayout } from "./auth-layout";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const body = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: { message?: string };
      };

      if (!res.ok) {
        setError(body.error?.message ?? "Unable to process password reset request.");
        return;
      }

      setSubmitted(true);
      setMessage(
        body.message ??
          "If an account exists with this email, a password reset link has been sent.",
      );
    } catch {
      setError("Network error. Please verify the gateway is reachable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout variant="forgot-password">
      {submitted ? (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#e6f4ea",
              color: "#137333",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "24px",
            }}
          >
            ✓
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#202124", marginBottom: "8px" }}>
            Check your inbox
          </h3>
          <p style={{ fontSize: "14px", color: "#5f6368", lineHeight: 1.5, marginBottom: "24px" }}>
            {message}
          </p>
          <Link
            href="/login"
            className="auth-btn-primary"
            style={{ display: "inline-flex", textDecoration: "none", justifyContent: "center" }}
          >
            Return to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">
              Account Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
            />
          </div>

          {error ? (
            <p role="alert" className="auth-error">
              {error}
            </p>
          ) : null}

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            <span>{loading ? "Sending link…" : "Send recovery link"}</span>
            <span className="auth-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
