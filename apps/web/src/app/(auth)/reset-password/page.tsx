import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: "Set new password — QuickStart AI",
  description: "Set a new password for your QuickStart workspace.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f6f3]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
