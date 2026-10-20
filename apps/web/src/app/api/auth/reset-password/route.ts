import { NextResponse } from "next/server";
import { gatewayFetch } from "@/lib/server/gateway/fetch";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; newPassword?: string };
    const token = body.token?.trim() ?? "";
    const newPassword = body.newPassword ?? "";

    if (!token) {
      return NextResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "Password reset token is required" } },
        { status: 400 },
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "Password must be at least 8 characters long" } },
        { status: 400 },
      );
    }

    const result = await gatewayFetch<{ message: string }>("/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ ok: true, message: result.data.message });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to process reset password request" } },
      { status: 500 },
    );
  }
}
