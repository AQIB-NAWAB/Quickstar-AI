"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthLayout } from "./auth-layout";
import { PasswordInput } from "./password-input";

export function RegisterForm() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          organization_name: organizationName,
        }),
      });
      const body = (await res.json()) as {
        redirect?: string;
        is_new_account?: boolean;
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(body.error?.message ?? "Registration failed");
        return;
      }
      router.replace(body.redirect ?? "/login");
      router.refresh();
    } catch {
      setError("Network error. Is the API gateway running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout variant="register">
      <form onSubmit={onSubmit}>
        <div className="auth-field">
          <label htmlFor="organization_name" className="auth-label">
            Organization name
          </label>
          <input
            id="organization_name"
            name="organization_name"
            autoComplete="organization"
            placeholder="Your business"
            required
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            className="auth-input"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="email" className="auth-label">
            Work email
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
          isNew={true}
          placeholder="Create a password"
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
          <span>{loading ? "Creating account…" : "Create account"}</span>
          <span className="auth-btn-arrow" aria-hidden="true">
            →
          </span>
        </button>
      </form>
    </AuthLayout>
  );
}
