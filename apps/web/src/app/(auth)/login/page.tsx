"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, AlertCircle } from "lucide-react";
import { fetchGateway } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetchGateway("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res.error) {
        setError(res.error.message);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-base flex flex-col justify-center py-12 sm:px-6 lg:px-8 firecrawl-grid">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-accent-black mb-2">
          firecrawl
        </Link>
        <h2 className="text-xl font-bold tracking-tight text-accent-black">
          Sign in to your account
        </h2>
        <p className="mt-2 text-xs text-neutral-500">
          Or{" "}
          <Link href="/register" className="font-semibold text-heat-100 hover:underline">
            start with 500 free credits
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-surface py-8 px-6 shadow-firecrawl-card rounded-20 sm:px-10 border border-border-faint">
          {error && (
            <div className="mb-4 p-3 rounded-8 bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 rounded-8 border border-border-faint bg-white text-sm text-accent-black placeholder:text-neutral-400 focus:outline-none focus:border-heat-100 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-neutral-500 hover:text-heat-100"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-8 border border-border-faint bg-white text-sm text-accent-black placeholder:text-neutral-400 focus:outline-none focus:border-heat-100 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-10 text-sm font-semibold text-white bg-heat-100 hover:bg-[#e04f12] active:scale-[0.98] transition-all disabled:opacity-50 shadow-firecrawl-btn mt-2"
            >
              <span>{loading ? "Signing in..." : "Sign in"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
