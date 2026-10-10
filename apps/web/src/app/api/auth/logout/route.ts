import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_ACCESS, COOKIE_REFRESH } from "@/lib/server/auth/constants";
import { clearTokenCookies } from "@/lib/server/auth/cookies";
import { gatewayFetch } from "@/lib/server/gateway/fetch";

export async function POST() {
  const jar = await cookies();
  const access = jar.get(COOKIE_ACCESS)?.value;
  const refresh = jar.get(COOKIE_REFRESH)?.value;

  if (refresh || access) {
    await gatewayFetch("/v1/logout", {
      method: "POST",
      accessToken: access ?? null,
      body: JSON.stringify({ refresh_token: refresh }),
    });
  }

  const res = NextResponse.json({ ok: true });
  clearTokenCookies(res);
  return res;
}
