"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to manage agents, inbox, and workspace settings."
      footer={
        <>
          <span className="text-neutral-500">New here? </span>
          <Link href="/register" className="font-semibold text-heat-100 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? (
          <p className="rounded-10 border border-red-100 bg-red-50 px-3 py-2 text-sm text-accent-crimson">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
