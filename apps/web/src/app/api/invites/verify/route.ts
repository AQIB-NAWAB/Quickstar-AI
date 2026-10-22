import { NextResponse } from "next/server";
import { gatewayFetch } from "@/lib/server/gateway/fetch";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim() ?? "";

    if (!token) {
      return NextResponse.json(
        { valid: false, message: "Token is required" },
        { status: 400 },
      );
    }

    const result = await gatewayFetch<{
      valid: boolean;
      workspace?: { id: string; name: string; slug: string };
      email?: string;
      role?: string;
      expired?: boolean;
      accepted?: boolean;
      message?: string;
    }>(`/v1/invites/verify?token=${encodeURIComponent(token)}`);

    if (!result.ok) {
      return NextResponse.json({ valid: false, message: result.error.message }, { status: result.status || 400 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    return NextResponse.json(
      { valid: false, message: "Failed to verify invitation token" },
      { status: 500 },
    );
  }
}
