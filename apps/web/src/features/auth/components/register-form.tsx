"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "./password-input";
import { Input } from "@/components/ui/input";

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
    <AuthCard
      title="Create your account"
      subtitle="Create your organization and first workspace in one step."
      footer={
        <>
          <span className="text-neutral-500">Already have an account? </span>
          <Link href="/login" className="font-semibold text-heat-100 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Organization name"
          name="organization_name"
          autoComplete="organization"
          className="h-11 rounded-8 text-[13px]"
          required
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          placeholder="Acme Support"
        />
        <Input
          label="Work email"
          name="email"
          type="email"
          placeholder="you@company.com"
          className="h-11 rounded-8 text-[13px]"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordInput value={password} onChange={setPassword} isNew />
        {error ? (
          <p role="alert" className="rounded-10 border border-red-100 bg-red-50 px-3 py-2 text-sm text-accent-crimson">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full h-11 rounded-8 bg-heat-100 hover:bg-heat-100/90 shadow-none" loading={loading}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
