"use client";

import type { ReactNode } from "react";
import { AuthLayout } from "./auth-layout";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Backward-compatibility wrapper delegating to the approved AuthLayout.
 */
export function AuthCard({ title, subtitle, children }: Props) {
  const isRegister = title.toLowerCase().includes("account");
  return (
    <AuthLayout
      variant={isRegister ? "register" : "login"}
      title={title}
      subtitle={subtitle}
    >
      {children}
    </AuthLayout>
  );
}
