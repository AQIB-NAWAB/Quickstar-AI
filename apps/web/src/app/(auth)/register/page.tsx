"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { fetchGateway } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetchGateway("/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          organizationName: orgName,
          email,
          password,
        }),
      });

      if (res.error) {
        setError(res.error.message);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account");
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
          Create your account
        </h2>
        <p className="mt-2 text-xs text-neutral-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-heat-100 hover:underline">
            Sign in
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
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 rounded-8 border border-border-faint bg-white text-sm text-accent-black placeholder:text-neutral-400 focus:outline-none focus:border-heat-100 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Organization / Company
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme AI"
                className="w-full px-3 py-2 rounded-8 border border-border-faint bg-white text-sm text-accent-black placeholder:text-neutral-400 focus:outline-none focus:border-heat-100 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@acme.com"
                className="w-full px-3 py-2 rounded-8 border border-border-faint bg-white text-sm text-accent-black placeholder:text-neutral-400 focus:outline-none focus:border-heat-100 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3 py-2 rounded-8 border border-border-faint bg-white text-sm text-accent-black placeholder:text-neutral-400 focus:outline-none focus:border-heat-100 transition-colors"
              />
            </div>

            <div className="pt-2 text-xs text-neutral-500 space-y-1.5">
              <div className="flex items-center gap-1.5 text-neutral-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>500 free credits included immediately</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>No credit card required</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-10 text-sm font-semibold text-white bg-heat-100 hover:bg-[#e04f12] active:scale-[0.98] transition-all disabled:opacity-50 shadow-firecrawl-btn mt-2"
            >
              <span>{loading ? "Creating account..." : "Start for free"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
