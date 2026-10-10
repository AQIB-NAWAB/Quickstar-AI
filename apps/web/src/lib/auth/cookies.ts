import type { NextResponse } from "next/server";
import { COOKIE_ACCESS, COOKIE_REFRESH } from "./constants";

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type?: string;
};

const isProd = process.env.NODE_ENV === "production";

export function applyTokenCookies(res: NextResponse, tokens: TokenPair): void {
  const accessMaxAge = Math.max(60, tokens.expires_in);
  res.cookies.set(COOKIE_ACCESS, tokens.access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: accessMaxAge,
  });
  res.cookies.set(COOKIE_REFRESH, tokens.refresh_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearTokenCookies(res: NextResponse): void {
  res.cookies.set(COOKIE_ACCESS, "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set(COOKIE_REFRESH, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export { COOKIE_ACCESS, COOKIE_REFRESH };
