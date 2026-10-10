import { cookies } from "next/headers";
import { COOKIE_ACCESS } from "./constants";

export function gatewayBaseUrl(): string {
  return (
    process.env.GATEWAY_URL ??
    process.env.NEXT_PUBLIC_GATEWAY_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export type GatewayError = {
  code: string;
  message: string;
  request_id?: string;
};

export type GatewayResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: GatewayError; status: number };

function parseErrorBody(body: Record<string, unknown>, status: number): GatewayError {
  const nested = body.error as { code?: string; message?: string; request_id?: string } | undefined;
  if (nested?.message) {
    return {
      code: nested.code ?? `HTTP_${status}`,
      message: nested.message,
      request_id: nested.request_id ?? (body.request_id as string | undefined),
    };
  }
  return {
    code: (body.code as string) ?? `HTTP_${status}`,
    message: (body.message as string) ?? "Request failed",
    request_id: body.request_id as string | undefined,
  };
}

export async function gatewayFetch<T>(
  path: string,
  options: RequestInit & { accessToken?: string | null } = {},
): Promise<GatewayResult<T>> {
  const url = `${gatewayBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }
  headers.set("Accept", "application/json");

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { ok: false, error: parseErrorBody(body, res.status), status: res.status };
    }
    return { ok: true, data: body as T, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Failed to reach API gateway",
      },
      status: 0,
    };
  }
}

export async function getAccessTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_ACCESS)?.value ?? null;
}
