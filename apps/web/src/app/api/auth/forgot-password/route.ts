import { NextResponse } from "next/server";
import { gatewayFetch } from "@/lib/server/gateway/fetch";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim() ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "Valid email address is required" } },
        { status: 400 },
      );
    }

    const result = await gatewayFetch<{ message: string }>("/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ ok: true, message: result.data.message });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to process forgot password request" } },
      { status: 500 },
    );
  }
}
