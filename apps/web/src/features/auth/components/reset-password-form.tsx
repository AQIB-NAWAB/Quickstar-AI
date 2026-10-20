"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "./auth-layout";
import { PasswordInput } from "./password-input";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthLayout variant="reset-password">
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#fce8e6",
              color: "#c5221f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "24px",
            }}
          >
            !
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#202124", marginBottom: "8px" }}>
            Invalid or missing link
          </h3>
          <p style={{ fontSize: "14px", color: "#5f6368", lineHeight: 1.5, marginBottom: "24px" }}>
            This password reset link is invalid or has expired. Please request a new link.
          </p>
          <Link
            href="/forgot-password"
            className="auth-btn-primary"
            style={{ display: "inline-flex", textDecoration: "none", justifyContent: "center" }}
          >
            Request new reset link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const body = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: { message?: string };
      };

      if (!res.ok) {
        setError(body.error?.message ?? "Unable to reset password. The link may have expired.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please verify the gateway is reachable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout variant="reset-password">
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
            Password updated
          </h3>
          <p style={{ fontSize: "14px", color: "#5f6368", lineHeight: 1.5, marginBottom: "24px" }}>
            Your password has been changed successfully. Any previous active sessions have been revoked.
          </p>
          <Link
            href="/login"
            className="auth-btn-primary"
            style={{ display: "inline-flex", textDecoration: "none", justifyContent: "center" }}
          >
            Sign in with new password
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <PasswordInput
            value={password}
            onChange={setPassword}
            isNew={true}
            placeholder="New password (min. 8 characters)"
          />

          <div className="auth-field" style={{ marginTop: "16px" }}>
            <label htmlFor="confirmPassword" className="auth-label">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input"
            />
          </div>

          {error ? (
            <p role="alert" className="auth-error">
              {error}
            </p>
          ) : null}

          <button type="submit" className="auth-btn-primary" disabled={loading} style={{ marginTop: "24px" }}>
            <span>{loading ? "Updating password…" : "Save new password"}</span>
            <span className="auth-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
