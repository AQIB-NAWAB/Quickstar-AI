"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthLayout } from "./auth-layout";
import { PasswordInput } from "./password-input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as {
        redirect?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(body.error?.message ?? "Sign in failed");
        return;
      }
      const next = searchParams.get("next");
      if (next && next.startsWith("/workspaces/")) {
        router.replace(next);
      } else {
        router.replace(body.redirect ?? "/login");
      }
      router.refresh();
    } catch {
      setError("Network error. Is the API gateway running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout variant="login">
      <form onSubmit={onSubmit}>
        <div className="auth-field">
          <label htmlFor="email" className="auth-label">
            Email
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

        <PasswordInput
          value={password}
          onChange={setPassword}
          isNew={false}
          placeholder="Enter your password"
        />

        {error ? (
          <p role="alert" className="auth-error">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="auth-btn-primary"
          disabled={loading}
        >
          <span>{loading ? "Signing in…" : "Sign in"}</span>
          <span className="auth-btn-arrow" aria-hidden="true">
            →
          </span>
        </button>
      </form>
    </AuthLayout>
  );
}
