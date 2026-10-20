import { Suspense } from "react";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password — QuickStart AI",
  description: "Request a password reset link for your QuickStart workspace.",
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f6f3]" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
