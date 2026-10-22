import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Welcome back — QuickStart AI",
  description: "Sign in to your QuickStart workspace.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f6f3]" />}>
      <LoginForm />
    </Suspense>
  );
}
