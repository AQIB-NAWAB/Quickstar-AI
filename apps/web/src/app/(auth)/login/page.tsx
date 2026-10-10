import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background-base" />}>
      <LoginForm />
    </Suspense>
  );
}
