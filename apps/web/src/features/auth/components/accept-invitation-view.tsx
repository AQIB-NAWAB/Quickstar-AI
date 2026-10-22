"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "./auth-layout";

type VerifyResult = {
  valid: boolean;
  workspace?: { id: string; name: string; slug: string };
  email?: string;
  role?: string;
  expired?: boolean;
  accepted?: boolean;
  message?: string;
};

export function AcceptInvitationView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [verifyStatus, setVerifyStatus] = useState<"loading" | "valid" | "expired" | "accepted" | "invalid">("loading");
  const [inviteData, setInviteData] = useState<VerifyResult | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setVerifyStatus("invalid");
      return;
    }

    let active = true;
    async function verify() {
      try {
        const res = await fetch(`/api/invites/verify?token=${encodeURIComponent(token)}`);
        const data = (await res.json()) as VerifyResult;

        if (!active) return;
        setInviteData(data);

        if (data.valid) {
          setVerifyStatus("valid");
        } else if (data.accepted) {
          setVerifyStatus("accepted");
        } else if (data.expired) {
          setVerifyStatus("expired");
        } else {
          setVerifyStatus("invalid");
        }
      } catch {
        if (!active) return;
        setVerifyStatus("invalid");
      }
    }

    void verify();
    return () => {
      active = false;
    };
  }, [token]);

  async function onAccept() {
    setError(null);
    setAccepting(true);

    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const body = (await res.json()) as {
        ok?: boolean;
        redirect?: string;
        error?: { code?: string; message?: string };
      };

      if (res.status === 401) {
        // User not logged in: redirect to login with callback
        const nextUrl = `/accept-invitation?token=${encodeURIComponent(token)}`;
        router.push(`/login?next=${encodeURIComponent(nextUrl)}`);
        return;
      }

      if (!res.ok) {
        setError(body.error?.message ?? "Unable to accept invitation.");
        return;
      }

      if (body.redirect) {
        router.push(body.redirect);
      } else {
        router.push("/login");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAccepting(false);
    }
  }

  if (verifyStatus === "loading") {
    return (
      <AuthLayout variant="invite">
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <p style={{ color: "#5f6368", fontSize: "14px" }}>Verifying your invitation…</p>
        </div>
      </AuthLayout>
    );
  }

  if (verifyStatus === "accepted") {
    return (
      <AuthLayout variant="invite">
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#e8f0fe",
              color: "#1a73e8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "24px",
            }}
          >
            ✓
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#202124", marginBottom: "8px" }}>
            Already Accepted
          </h3>
          <p style={{ fontSize: "14px", color: "#5f6368", lineHeight: 1.5, marginBottom: "24px" }}>
            This invitation has already been accepted. You can sign in directly to access your workspace.
          </p>
          <Link
            href="/login"
            className="auth-btn-primary"
            style={{ display: "inline-flex", textDecoration: "none", justifyContent: "center" }}
          >
            Sign in to workspace
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (verifyStatus === "expired") {
    return (
      <AuthLayout variant="invite">
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#fce8e6",
              color: "#c5221f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "24px",
            }}
          >
            !
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#202124", marginBottom: "8px" }}>
            Invitation Expired
          </h3>
          <p style={{ fontSize: "14px", color: "#5f6368", lineHeight: 1.5, marginBottom: "24px" }}>
            This invitation link has expired. Please ask the workspace administrator to resend your invite.
          </p>
          <Link
            href="/login"
            className="auth-btn-primary"
            style={{ display: "inline-flex", textDecoration: "none", justifyContent: "center" }}
          >
            Return to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (verifyStatus === "invalid" || !inviteData?.workspace) {
    return (
      <AuthLayout variant="invite">
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#fce8e6",
              color: "#c5221f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "24px",
            }}
          >
            !
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#202124", marginBottom: "8px" }}>
            Invalid Invitation
          </h3>
          <p style={{ fontSize: "14px", color: "#5f6368", lineHeight: 1.5, marginBottom: "24px" }}>
            This invitation link is not valid or could not be found. Please check the URL or request a new invite.
          </p>
          <Link
            href="/login"
            className="auth-btn-primary"
            style={{ display: "inline-flex", textDecoration: "none", justifyContent: "center" }}
          >
            Return to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      variant="invite"
      title={`Join ${inviteData.workspace.name}`}
      subtitle={`You've been invited to join as a ${inviteData.role}.`}
    >
      <div style={{ margin: "20px 0" }}>
        <div
          style={{
            background: "#f8f9fa",
            border: "1px solid #dadce0",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", color: "#5f6368" }}>Workspace:</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#202124" }}>
              {inviteData.workspace.name}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", color: "#5f6368" }}>Invited Email:</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#202124" }}>
              {inviteData.email}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: "#5f6368" }}>Role:</span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#137333",
                background: "#e6f4ea",
                padding: "2px 8px",
                borderRadius: "4px",
                textTransform: "capitalize",
              }}
            >
              {inviteData.role}
            </span>
          </div>
        </div>

        {error ? (
          <p role="alert" className="auth-error" style={{ marginBottom: "16px" }}>
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onAccept}
          className="auth-btn-primary"
          disabled={accepting}
        >
          <span>{accepting ? "Joining workspace…" : `Accept & Join ${inviteData.workspace.name}`}</span>
          <span className="auth-btn-arrow" aria-hidden="true">
            →
          </span>
        </button>
      </div>
    </AuthLayout>
  );
}
