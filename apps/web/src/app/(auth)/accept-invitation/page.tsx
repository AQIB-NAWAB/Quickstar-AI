import { Suspense } from "react";
import type { Metadata } from "next";
import { AcceptInvitationView } from "@/features/auth/components/accept-invitation-view";

export const metadata: Metadata = {
  title: "Join Workspace — QuickStart AI",
  description: "Accept an invitation to join a QuickStart AI workspace.",
};

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f6f3]" />}>
      <AcceptInvitationView />
    </Suspense>
  );
}
