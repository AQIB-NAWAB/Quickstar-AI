import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Create your account — QuickStart AI",
  description: "Set up your organization and first workspace.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
