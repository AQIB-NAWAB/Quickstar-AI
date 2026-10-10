import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_REFRESH_THRESHOLD_SEC,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
} from "@/lib/auth/constants";
import { accessTokenNeedsRefresh } from "@/lib/auth/jwt";

function redirectToLogin(request: NextRequest): NextResponse {
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

function copySetCookies(from: Response, to: NextResponse): void {
  const raw = from.headers.get("set-cookie");
  if (!raw) {
    return;
  }
  for (const part of raw.split(/,(?=\s*[^;]+=[^;]+)/)) {
    to.headers.append("set-cookie", part.trim());
  }
}

export async function middleware(request: NextRequest) {
  const access = request.cookies.get(COOKIE_ACCESS)?.value;
  const refresh = request.cookies.get(COOKIE_REFRESH)?.value;

  if (!access && !refresh) {
    return redirectToLogin(request);
  }

  if (access && accessTokenNeedsRefresh(access, ACCESS_REFRESH_THRESHOLD_SEC) && refresh) {
    const refreshUrl = new URL("/api/auth/refresh", request.url);
    const refreshRes = await fetch(refreshUrl, {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    if (!refreshRes.ok) {
      const res = redirectToLogin(request);
      res.cookies.delete(COOKIE_ACCESS);
      res.cookies.delete(COOKIE_REFRESH);
      return res;
    }
    const res = NextResponse.next();
    copySetCookies(refreshRes, res);
    return res;
  }

  if (!access && refresh) {
    const refreshUrl = new URL("/api/auth/refresh", request.url);
    const refreshRes = await fetch(refreshUrl, {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    if (!refreshRes.ok) {
      return redirectToLogin(request);
    }
    const res = NextResponse.next();
    copySetCookies(refreshRes, res);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/workspaces/:path*", "/dashboard/:path*"],
};
