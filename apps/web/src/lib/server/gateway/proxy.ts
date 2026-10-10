import { NextResponse } from "next/server";
import { gatewayFetch, getAccessTokenFromCookies, type GatewayError } from "./fetch";

type ProxyOk<T> = { ok: true; data: T; status: number };
type ProxyFail = { ok: false; response: NextResponse };

export async function proxyToGateway<T>(
  path: string,
  init?: RequestInit,
): Promise<ProxyOk<T> | ProxyFail> {
  const token = await getAccessTokenFromCookies();
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: { code: "UNAUTHORIZED", message: "Not signed in" } as GatewayError,
        },
        { status: 401 },
      ),
    };
  }

  const result = await gatewayFetch<T>(path, { ...init, accessToken: token });
  if (!result.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: result.error }, { status: result.status || 502 }),
    };
  }

  return { ok: true, data: result.data, status: result.status };
}
